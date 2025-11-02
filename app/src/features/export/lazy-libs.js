const CDN_BASE = 'https://cdn.jsdelivr.net'

let html2canvasPromise
let jspdfPromise
let jszipPromise

async function loadHtml2Canvas () {
  if (!html2canvasPromise) {
    html2canvasPromise = import(
      /* @vite-ignore */ `${CDN_BASE}/npm/html2canvas@1.4.1/+esm`
    ).then(mod => mod.default || mod)
  }
  return html2canvasPromise
}

async function loadJsPDF () {
  if (!jspdfPromise) {
    jspdfPromise = import(
      /* @vite-ignore */ `${CDN_BASE}/npm/jspdf@2.5.1/+esm`
    ).then(mod => {
      if (mod?.jsPDF) return mod.jsPDF
      if (mod?.default?.jsPDF) return mod.default.jsPDF
      return mod?.default || mod
    })
  }
  return jspdfPromise
}

async function loadJSZip () {
  if (!jszipPromise) {
    jszipPromise = import(
      /* @vite-ignore */ `${CDN_BASE}/npm/jszip@3.10.1/+esm`
    ).then(mod => mod.default || mod)
  }
  return jszipPromise
}

export async function ensureExportLibs () {
  const [jsPDF, html2canvas] = await Promise.all([
    loadJsPDF(),
    loadHtml2Canvas()
  ])
  return { jsPDF, html2canvas }
}

export async function ensureZipLib () {
  const JSZip = await loadJSZip()
  return { JSZip }
}

export function prefetchExportLibs () {
  void ensureExportLibs()
}

export function resetExportLibCache () {
  html2canvasPromise = undefined
  jspdfPromise = undefined
  jszipPromise = undefined
}
