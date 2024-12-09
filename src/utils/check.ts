import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { execaCommand } from 'execa'
import { importPackage } from './import'

export interface CheckOptions {
  packageName: string
  saveMode?: string
  needImport?: boolean
  needInstall?: boolean
}

export interface ModuleDesc {
  module: any
}

export async function checkPackage(options: CheckOptions): Promise<ModuleDesc | boolean | undefined> {
  const {
    packageName: p,
    saveMode: t = '',
    needImport = false,
    needInstall = true,
  } = options
  const cwd = process.cwd()
  const path = resolve(cwd, `node_modules/${p}`)

  if (existsSync(path)) {
    if (needImport) {
      const data = await importPackage(p)
      return data
    }
    return true
  }
  else {
    if (!needInstall)
      return false
    const command = `pnpm install ${p} ${t}`
    await execaCommand(command)
    if (needImport) {
      const data = await importPackage(p)
      return data
    }
  }
}
