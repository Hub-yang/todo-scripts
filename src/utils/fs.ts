import { resolve } from 'node:path'
import fs from 'node:fs'
import process from 'node:process'
import { writeFile as w } from 'node:fs/promises'
import type { AnyKey } from '../../global'

export function getPackageJSON(): any {
  const cwd = process.cwd()
  const path = resolve(cwd, 'package.json')

  if (fs.existsSync(path)) {
    try {
      const raw = fs.readFileSync(path, 'utf-8')
      const data = JSON.parse(raw)
      return data
    }
    catch (e) {
      console.warn('\nFailed to parse package.json')
      process.exit(1)
    }
  }
}

export async function writePackageJSON(data: AnyKey) {
  try {
    await w('package.json', `${JSON.stringify(data, null, 2)}\n`)
  }
  catch (error) {
    console.warn('\nFailed to write in package.json')
    process.exit(1)
  }
}
