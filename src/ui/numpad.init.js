import { openNumpad } from './numpad.js'

function parseNumericValue (value) {
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/,/g, '.').trim()
  if (normalized === '') return 0
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatResult (value, useComma) {
  const numeric = Number(value)
  const stringValue = Number.isFinite(numeric) ? String(numeric) : '0'
  return useComma ? stringValue.replace('.', ',') : stringValue
}

function applyBinding (input) {
  if (!(input instanceof HTMLInputElement)) return
  if (input.dataset.npBound === 'true') return
  if (input.disabled) return

  input.dataset.npBound = 'true'
  const originalInputMode = input.getAttribute('inputmode')
  if (!originalInputMode || originalInputMode === 'numeric') {
    input.setAttribute('inputmode', 'decimal')
  }
  input.readOnly = true

  const open = () => {
    const baseValue = parseNumericValue(input.value)
    openNumpad({
      initial: '',
      baseValue,
      onConfirm: value => {
        const useComma = input.dataset.decimal === 'comma'
        input.value = formatResult(value, useComma)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  }

  input.addEventListener('click', open)
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  })
}

function scan (root) {
  root.querySelectorAll('input[data-numpad="true"]').forEach(applyBinding)
}

export function initNumpadBinding (root = document) {
  const target = root === document ? document.body : root
  if (!target) return

  scan(target)

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return
          if (node.matches('input[data-numpad="true"]')) {
            applyBinding(node)
          }
          node.querySelectorAll?.('input[data-numpad="true"]').forEach(applyBinding)
        })
      }
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-numpad') {
        const targetNode = mutation.target
        if (targetNode instanceof HTMLInputElement && targetNode.dataset.numpad === 'true') {
          applyBinding(targetNode)
        }
      }
    })
  })

  observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-numpad'] })
  return () => observer.disconnect()
}
