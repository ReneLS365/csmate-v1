#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from 'pngjs'

const { PNG } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

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
    r: Math.round(a.r + (b.r - a.r) * clamp),
    g: Math.round(a.g + (b.g - a.g) * clamp),
    b: Math.round(a.b + (b.b - a.b) * clamp),
    a: Math.round(a.a + (b.a - a.a) * clamp)
  }
}

function setPixel (png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return
  const idx = (png.width * y + x) << 2
  png.data[idx] = color.r
  png.data[idx + 1] = color.g
  png.data[idx + 2] = color.b
  png.data[idx + 3] = color.a ?? 255
}

function fillRect (png, x, y, width, height, color) {
  const clampedColor = color.a === undefined ? { ...color, a: 255 } : color
  for (let iy = Math.max(0, y); iy < Math.min(png.height, y + height); iy++) {
    for (let ix = Math.max(0, x); ix < Math.min(png.width, x + width); ix++) {
      setPixel(png, ix, iy, clampedColor)
    }
  }
}

function fillRoundedRect (png, x, y, width, height, radius, color) {
  const r = Math.max(0, Math.min(Math.floor(radius), Math.min(width, height) / 2))
  const squareColor = color.a === undefined ? { ...color, a: 255 } : color
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
        setPixel(png, globalX, globalY, squareColor)
        continue
      }

      if ((dx * dx) + (dy * dy) <= r * r) {
        setPixel(png, globalX, globalY, squareColor)
      }
    }
  }
}

function fillVerticalGradient (png, topColor, bottomColor) {
  for (let y = 0; y < png.height; y++) {
    const ratio = png.height <= 1 ? 0 : y / (png.height - 1)
    const color = mix(topColor, bottomColor, ratio)
    for (let x = 0; x < png.width; x++) {
      setPixel(png, x, y, color)
    }
  }
}

function drawCircle (png, cx, cy, radius, color) {
  const sq = radius * radius
  const finalColor = color.a === undefined ? { ...color, a: 255 } : color
  const minX = Math.max(0, Math.floor(cx - radius))
  const maxX = Math.min(png.width - 1, Math.ceil(cx + radius))
  const minY = Math.max(0, Math.floor(cy - radius))
  const maxY = Math.min(png.height - 1, Math.ceil(cy + radius))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx
      const dy = y - cy
      if ((dx * dx) + (dy * dy) <= sq) {
        setPixel(png, x, y, finalColor)
      }
    }
  }
}

function drawScaffoldIcon (size, { maskable = false } = {}) {
  const png = new PNG({ width: size, height: size })
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

  // Vertical columns
  fillRect(png, Math.round(size / 2) - barOffset - Math.floor(columnWidth / 2), verticalTop, columnWidth, verticalBottom - verticalTop, structureColor)
  fillRect(png, Math.round(size / 2) + barOffset - Math.floor(columnWidth / 2), verticalTop, columnWidth, verticalBottom - verticalTop, structureColor)
  fillRect(png, Math.round(size / 2) - Math.floor(columnWidth / 2), verticalTop, columnWidth, verticalBottom - verticalTop, structureColor)

  // Horizontal connectors
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

  // Highlight node
  drawCircle(png, size * 0.33, size * 0.34, Math.max(6, size * 0.08), mix(palette.highlight, palette.accentSoft, 0.5))

  return png
}

function drawScreenshot (width, height, { layout }) {
  const png = new PNG({ width, height })
  fillVerticalGradient(png, palette.midnight, palette.deepSea)

  const safeX = Math.round(width * 0.07)
  const safeY = Math.round(height * 0.07)
  const safeWidth = width - safeX * 2
  const safeHeight = height - safeY * 2

  // Outer frame
  fillRoundedRect(png, safeX, safeY, safeWidth, safeHeight, Math.round(Math.min(width, height) * 0.04), palette.surface)

  const contentPadding = Math.round(Math.min(width, height) * 0.04)
  const contentX = safeX + contentPadding
  const contentY = safeY + contentPadding
  const contentWidth = safeWidth - contentPadding * 2
  const contentHeight = safeHeight - contentPadding * 2

  // Header / hero block
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

  // Floating button / actions
  const buttonSize = Math.round(Math.min(width, height) * 0.1)
  fillCircleButton(png, contentX + contentWidth - buttonSize - Math.round(contentPadding * 0.3), bodyTop - Math.round(buttonSize * 0.6), buttonSize, palette.accent)

  return png
}

function fillCircleButton (png, x, y, size, color) {
  drawCircle(png, x + size / 2, y + size / 2, size / 2, mix(color, palette.highlight, 0.2))
  drawCircle(png, x + size / 2, y + size / 2, size * 0.32, mix(palette.highlight, color, 0.65))
  drawCircle(png, x + size / 2, y + size / 2, size * 0.18, palette.highlight)
}

async function pngToBuffer (png) {
  return await new Promise((resolve, reject) => {
    const chunks = []
    png.pack()
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject)
  })
}

async function writePng (relativePath, png) {
  const absolute = resolve(projectRoot, relativePath)
  await mkdir(dirname(absolute), { recursive: true })
  const buffer = await pngToBuffer(png)
  await writeFile(absolute, buffer)
  return absolute
}

async function ensureAssets () {
  return await Promise.all([
    writePng('public/icons/icon-192.png', drawScaffoldIcon(192)),
    writePng('public/icons/icon-192-maskable.png', drawScaffoldIcon(192, { maskable: true })),
    writePng('public/icons/icon-512.png', drawScaffoldIcon(512)),
    writePng('public/icons/icon-512-maskable.png', drawScaffoldIcon(512, { maskable: true })),
    writePng('public/screenshots/home-1080x1920.png', drawScreenshot(1080, 1920, { layout: 'portrait' })),
    writePng('public/screenshots/home-1920x1080.png', drawScreenshot(1920, 1080, { layout: 'landscape' }))
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
