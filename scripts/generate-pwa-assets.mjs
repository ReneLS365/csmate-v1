#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const CRC_TABLE = createCrcTable()

function createCrcTable () {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[n] = c >>> 0
  }
  return table
}

function crc32 (buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function encodeChunk (type, data) {
  const chunk = Buffer.alloc(8 + data.length + 4)
  chunk.writeUInt32BE(data.length, 0)
  chunk.write(type, 4, 4, 'ascii')
  data.copy(chunk, 8)
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]))
  chunk.writeUInt32BE(crc >>> 0, chunk.length - 4)
  return chunk
}

function encodePng (image) {
  const { width, height, data } = image
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rowSize = width * 4
  const raw = Buffer.alloc((rowSize + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowSize + 1)
    raw[rowStart] = 0 // filter type
    const srcStart = y * rowSize
    for (let x = 0; x < rowSize; x++) {
      raw[rowStart + 1 + x] = data[srcStart + x]
    }
  }

  const idat = deflateSync(raw)

  return Buffer.concat([
    PNG_SIGNATURE,
    encodeChunk('IHDR', ihdr),
    encodeChunk('IDAT', idat),
    encodeChunk('IEND', Buffer.alloc(0))
  ])
}

function encodeIco (images) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('encodeIco requires at least one image buffer')
  }

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = header.length + (images.length * 16)
  const directory = images.map(({ width, height, data }) => {
    if (!data || typeof data.length !== 'number') {
      throw new Error('Invalid image buffer provided to encodeIco')
    }

    const entry = Buffer.alloc(16)
    entry[0] = width === 256 ? 0 : width
    entry[1] = height === 256 ? 0 : height
    entry[2] = 0
    entry[3] = 0
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })

  return Buffer.concat([header, ...directory, ...images.map((image) => image.data)])
}

class PngImage {
  constructor (width, height) {
    this.width = width
    this.height = height
    this.data = new Uint8ClampedArray(width * height * 4)
  }

  setPixel (x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const idx = (this.width * y + x) * 4
    const { r, g, b, a = 255 } = color
    this.data[idx] = clampColor(r)
    this.data[idx + 1] = clampColor(g)
    this.data[idx + 2] = clampColor(b)
    this.data[idx + 3] = clampColor(a)
  }
}

function clampColor (value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

const palette = {
  midnight: parseColor('#0f172a'),
  deepSea: parseColor('#0b1120'),
  slate: parseColor('#1e293b'),
  surface: parseColor('#111827'),
  panel: parseColor('#15213b'),
  panelLight: parseColor('#1f2b46'),
  accent: parseColor('#38bdf8'),
  accentSoft: parseColor('#bae6fd'),
  accentSecondary: parseColor('#22d3ee'),
  highlight: parseColor('#f8fafc'),
  textSubtle: parseColor('#94a3b8'),
  positive: parseColor('#10b981'),
  warning: parseColor('#f97316')
}

function parseColor (hex, alpha = 255) {
  const normalized = hex.replace('#', '')
  const size = normalized.length
  if (![3, 6].includes(size)) {
    throw new Error(`Unsupported color format: ${hex}`)
  }

  const expand = size === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized

  const int = Number.parseInt(expand, 16)
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
    a: alpha
  }
}

function mix (a, b, factor) {
  const clamp = Math.max(0, Math.min(1, factor))
  return {
    r: a.r + (b.r - a.r) * clamp,
    g: a.g + (b.g - a.g) * clamp,
    b: a.b + (b.b - a.b) * clamp,
    a: a.a + (b.a - a.a) * clamp
  }
}

function fillRect (png, x, y, width, height, color) {
  const fillColor = color.a === undefined ? { ...color, a: 255 } : color
  const startX = Math.max(0, x)
  const startY = Math.max(0, y)
  const endX = Math.min(png.width, x + width)
  const endY = Math.min(png.height, y + height)
  for (let iy = startY; iy < endY; iy++) {
    for (let ix = startX; ix < endX; ix++) {
      png.setPixel(ix, iy, fillColor)
    }
  }
}

function fillRoundedRect (png, x, y, width, height, radius, color) {
  const r = Math.max(0, Math.min(Math.floor(radius), Math.min(width, height) / 2))
  const fillColor = color.a === undefined ? { ...color, a: 255 } : color
  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const globalX = x + ix
      const globalY = y + iy
      if (globalX < 0 || globalY < 0 || globalX >= png.width || globalY >= png.height) continue

      let dx = 0
      if (ix < r) {
        dx = r - ix - 1
      } else if (ix >= width - r) {
        dx = ix - (width - r)
      }

      let dy = 0
      if (iy < r) {
        dy = r - iy - 1
      } else if (iy >= height - r) {
        dy = iy - (height - r)
      }

      if (dx <= 0 && dy <= 0) {
        png.setPixel(globalX, globalY, fillColor)
        continue
      }

      if ((dx * dx) + (dy * dy) <= r * r) {
        png.setPixel(globalX, globalY, fillColor)
      }
    }
  }
}

function fillVerticalGradient (png, topColor, bottomColor) {
  for (let y = 0; y < png.height; y++) {
    const ratio = png.height <= 1 ? 0 : y / (png.height - 1)
    const color = mix(topColor, bottomColor, ratio)
    for (let x = 0; x < png.width; x++) {
      png.setPixel(x, y, color)
    }
  }
}

function drawCircle (png, cx, cy, radius, color) {
  const sq = radius * radius
  const fillColor = color.a === undefined ? { ...color, a: 255 } : color
  const minX = Math.max(0, Math.floor(cx - radius))
  const maxX = Math.min(png.width - 1, Math.ceil(cx + radius))
  const minY = Math.max(0, Math.floor(cy - radius))
  const maxY = Math.min(png.height - 1, Math.ceil(cy + radius))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx
      const dy = y - cy
      if ((dx * dx) + (dy * dy) <= sq) {
        png.setPixel(x, y, fillColor)
      }
    }
  }
}

function drawScaffoldIcon (size, { maskable = false } = {}) {
  const png = new PngImage(size, size)
  fillVerticalGradient(png, palette.midnight, palette.slate)

  const haloRadius = size * (maskable ? 0.44 : 0.42)
  drawCircle(png, size / 2, size / 2, haloRadius, mix(palette.accentSoft, palette.highlight, 0.15))
  drawCircle(png, size / 2, size / 2, haloRadius * 0.78, palette.accent)

  const columnWidth = Math.max(6, Math.round(size * 0.08))
  const barOffset = Math.round(size * 0.22)
  const connectorHeight = Math.max(6, Math.round(size * 0.06))
  const connectorGap = Math.round(size * 0.22)
  const verticalTop = Math.round(size * 0.28)
  const verticalBottom = Math.round(size * 0.72)

  const structureColor = mix(palette.highlight, palette.accentSoft, 0.35)

  fillRect(png, Math.round(size / 2) - barOffset - Math.floor(columnWidth / 2), verticalTop, columnWidth, verticalBottom - verticalTop, structureColor)
  fillRect(png, Math.round(size / 2) + barOffset - Math.floor(columnWidth / 2), verticalTop, columnWidth, verticalBottom - verticalTop, structureColor)
  fillRect(png, Math.round(size / 2) - Math.floor(columnWidth / 2), verticalTop, columnWidth, verticalBottom - verticalTop, structureColor)

  for (let i = 0; i < 3; i++) {
    const y = verticalTop + i * connectorGap
    fillRect(
      png,
      Math.round(size / 2) - barOffset - Math.floor(columnWidth / 2),
      y,
      (barOffset * 2) + columnWidth,
      connectorHeight,
      mix(structureColor, palette.accentSecondary, 0.25)
    )
  }

  drawCircle(png, size * 0.33, size * 0.34, Math.max(6, size * 0.08), mix(palette.highlight, palette.accentSoft, 0.5))

  return png
}

function drawScreenshot (width, height, { layout }) {
  const png = new PngImage(width, height)
  fillVerticalGradient(png, palette.midnight, palette.deepSea)

  const safeX = Math.round(width * 0.07)
  const safeY = Math.round(height * 0.07)
  const safeWidth = width - safeX * 2
  const safeHeight = height - safeY * 2

  fillRoundedRect(png, safeX, safeY, safeWidth, safeHeight, Math.round(Math.min(width, height) * 0.04), palette.surface)

  const contentPadding = Math.round(Math.min(width, height) * 0.04)
  const contentX = safeX + contentPadding
  const contentY = safeY + contentPadding
  const contentWidth = safeWidth - contentPadding * 2
  const contentHeight = safeHeight - contentPadding * 2

  const headerHeight = Math.round(contentHeight * (layout === 'landscape' ? 0.28 : 0.22))
  fillRoundedRect(png, contentX, contentY, contentWidth, headerHeight, Math.round(contentPadding * 0.7), palette.panel)
  fillRoundedRect(
    png,
    contentX + Math.round(contentWidth * 0.04),
    contentY + Math.round(headerHeight * 0.55),
    Math.round(contentWidth * 0.32),
    Math.round(headerHeight * 0.28),
    Math.round(contentPadding * 0.5),
    mix(palette.accent, palette.highlight, 0.25)
  )
  fillRoundedRect(
    png,
    contentX + Math.round(contentWidth * 0.40),
    contentY + Math.round(headerHeight * 0.55),
    Math.round(contentWidth * 0.2),
    Math.round(headerHeight * 0.2),
    Math.round(contentPadding * 0.45),
    mix(palette.accentSecondary, palette.highlight, 0.35)
  )

  const bodyTop = contentY + headerHeight + Math.round(contentPadding * 0.8)
  const bodyHeight = contentHeight - headerHeight - Math.round(contentPadding * 1.6)

  const columnCount = layout === 'landscape' ? 2 : 1
  const columnGap = Math.round(contentPadding * 0.9)
  const columnWidth = Math.floor((contentWidth - columnGap * (columnCount - 1)) / columnCount)
  const cardHeight = Math.round(bodyHeight / (layout === 'landscape' ? 3.2 : 3.6))
  const cardGap = Math.round(contentPadding * 0.7)
  const cardRadius = Math.round(contentPadding * 0.6)

  for (let col = 0; col < columnCount; col++) {
    for (let row = 0; row < (layout === 'landscape' ? 3 : 4); row++) {
      const cardX = contentX + col * (columnWidth + columnGap)
      const cardY = bodyTop + row * (cardHeight + cardGap)
      if (cardY + cardHeight > contentY + contentHeight) break

      fillRoundedRect(png, cardX, cardY, columnWidth, cardHeight, cardRadius, palette.panelLight)

      const progressHeight = Math.max(6, Math.round(cardHeight * 0.12))
      fillRoundedRect(
        png,
        cardX + Math.round(columnWidth * 0.08),
        cardY + Math.round(cardHeight * 0.15),
        Math.round(columnWidth * 0.6),
        progressHeight,
        Math.round(progressHeight / 2),
        mix(palette.highlight, palette.accentSoft, 0.35)
      )

      fillRoundedRect(
        png,
        cardX + Math.round(columnWidth * 0.08),
        cardY + Math.round(cardHeight * 0.15),
        Math.round(columnWidth * 0.3),
        progressHeight,
        Math.round(progressHeight / 2),
        palette.accent
      )

      fillRect(
        png,
        cardX + Math.round(columnWidth * 0.08),
        cardY + Math.round(cardHeight * 0.45),
        Math.round(columnWidth * 0.78),
        Math.max(4, Math.round(cardHeight * 0.05)),
        palette.textSubtle
      )

      fillRect(
        png,
        cardX + Math.round(columnWidth * 0.08),
        cardY + Math.round(cardHeight * 0.62),
        Math.round(columnWidth * 0.45),
        Math.max(4, Math.round(cardHeight * 0.05)),
        mix(palette.textSubtle, palette.highlight, 0.4)
      )

      fillRoundedRect(
        png,
        cardX + Math.round(columnWidth * 0.62),
        cardY + Math.round(cardHeight * 0.65),
        Math.round(columnWidth * 0.28),
        Math.max(10, Math.round(cardHeight * 0.18)),
        Math.round(cardRadius * 0.8),
        row % 2 === 0 ? palette.positive : palette.warning
      )
    }
  }

  const buttonSize = Math.round(Math.min(width, height) * 0.1)
  fillCircleButton(png, contentX + contentWidth - buttonSize - Math.round(contentPadding * 0.3), bodyTop - Math.round(buttonSize * 0.6), buttonSize, palette.accent)

  return png
}

function fillCircleButton (png, x, y, size, color) {
  drawCircle(png, x + size / 2, y + size / 2, size / 2, mix(color, palette.highlight, 0.2))
  drawCircle(png, x + size / 2, y + size / 2, size * 0.32, mix(palette.highlight, color, 0.65))
  drawCircle(png, x + size / 2, y + size / 2, size * 0.18, palette.highlight)
}

async function writePng (relativePath, png) {
  const absolute = resolve(projectRoot, relativePath)
  await mkdir(dirname(absolute), { recursive: true })
  const buffer = encodePng(png)
  await writeFile(absolute, buffer)
  return absolute
}

async function writeIco (relativePath, icons) {
  if (!Array.isArray(icons) || icons.length === 0) {
    throw new Error('writeIco requires at least one icon image')
  }

  const absolute = resolve(projectRoot, relativePath)
  await mkdir(dirname(absolute), { recursive: true })

  const prepared = icons.map((icon) => {
    const image = icon?.png ?? icon
    if (!image || typeof image.width !== 'number' || typeof image.height !== 'number') {
      throw new Error('Icon entries must include a png with width and height')
    }
    return {
      width: image.width,
      height: image.height,
      data: encodePng(image)
    }
  })

  const buffer = encodeIco(prepared)
  await writeFile(absolute, buffer)
  return absolute
}

async function ensureAssets () {
  const icon16 = drawScaffoldIcon(16)
  const icon32 = drawScaffoldIcon(32)
  const icon192 = drawScaffoldIcon(192)
  const icon192Maskable = drawScaffoldIcon(192, { maskable: true })
  const icon512 = drawScaffoldIcon(512)
  const icon512Maskable = drawScaffoldIcon(512, { maskable: true })
  const portraitScreenshot = drawScreenshot(1080, 1920, { layout: 'portrait' })
  const landscapeScreenshot = drawScreenshot(1920, 1080, { layout: 'landscape' })

  return await Promise.all([
    writePng('public/icons/icon-16.png', icon16),
    writePng('public/icons/icon-32.png', icon32),
    writePng('public/icons/icon-192.png', icon192),
    writePng('public/icons/icon-192-maskable.png', icon192Maskable),
    writePng('public/icons/icon-512.png', icon512),
    writePng('public/icons/icon-512-maskable.png', icon512Maskable),
    writePng('public/screenshots/home-1080x1920.png', portraitScreenshot),
    writePng('public/screenshots/home-1920x1080.png', landscapeScreenshot),
    writeIco('public/favicon.ico', [icon16, icon32])
  ])
}

async function main () {
  const files = await ensureAssets()
  for (const file of files) {
    console.log(`Generated ${file}`)
  }
}

main().catch(error => {
  console.error(error?.stack || error?.message || error)
  process.exitCode = 1
})
