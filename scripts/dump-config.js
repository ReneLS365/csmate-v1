#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(new URL('.', import.meta.url).pathname, '..')
const targetPath = resolve(projectRoot, 'src/templates/hulmose.json')

const raw = readFileSync(targetPath, 'utf8')
console.log(JSON.parse(raw))
