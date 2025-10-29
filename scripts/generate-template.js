#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(new URL('.', import.meta.url).pathname, '..')
const sourcePath = resolve(projectRoot, 'data/templates/hulmose.json')
const targetPath = resolve(projectRoot, 'src/templates/hulmose.json')

function loadTemplate (path) {
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw)
}

function saveTemplate (path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function main () {
  const template = loadTemplate(sourcePath)
  template._meta = {
    ...template._meta,
    template: 'hulmose',
    admin_code: 'StilAce'
  }
  saveTemplate(targetPath, template)
  console.log(`Skabelon genereret → ${targetPath}`)
}

main()
