import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export function getPkgInfo() {
  const filePath = fileURLToPath(import.meta.url)
  const dirPath = path.dirname(filePath)
  const packageJsonPath = path.resolve(dirPath, '../package.json')

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf-8')
    const data = JSON.parse(raw)
    return data
  }
  catch (_e) {
    return {}
  }
}
