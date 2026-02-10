import fs, { existsSync } from 'node:fs'
import { writeFile as w } from 'node:fs/promises'
import path, { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { execaCommand } from 'execa'
import colors from 'picocolors'
import terminalLink from 'terminal-link'
import spinner from 'yocto-spinner'
import { DEFAULT_PKG_NAME, REPO_URL } from '@/constants'
import { Print } from './print'

export interface AnyKey {
  [key: string]: any
}

interface CheckOptions {
  packageName: string
  saveMode?: string
  needImport?: boolean
  needInstall?: boolean
}

interface ModuleDesc {
  module: any
}

const { bold, italic, blue, dim } = colors

/**
 * print banner
 */
export function banner() {
  let { version = '--', author = 'HuberyYang', name = DEFAULT_PKG_NAME, homepage = REPO_URL } = getPkgInfo()
  const l_version = version.length
  const l_author = author.length
  const l_name = name.length
  name = bold(italic(name))
  version = blue(`version ${version}`)
  author = blue(`author ${author}`)
  homepage = dim(`(${homepage})`)

  const link_version = terminalLink(version, `https://www.npmjs.com/package/${DEFAULT_PKG_NAME}`)
  const link_name = terminalLink(name, REPO_URL)
  const link_author = terminalLink(author, REPO_URL)
  const isSupportLink = terminalLink.isSupported

  const l_init = 36
  const lineBase = '='.repeat(l_init)
  const lineOne = `⦚${' '.repeat(l_init - 2 - l_name)}${isSupportLink ? link_name : name}⦚`
  const lineTwo = `⦚${' '.repeat(l_init - 2)}⦚`
  const lineThree = `⦚${' '.repeat(l_init - 2 - l_version - 'version'.length - 1)}${isSupportLink ? link_version : version}⦚`
  const lineFour = `⦚${' '.repeat(l_init - 2 - l_author - 'author'.length - 1)}${isSupportLink ? link_author : author}⦚`

  if (isSupportLink) {
    console.log(`
     ${lineBase}
     ${lineOne}
     ${lineTwo}
     ${lineThree}
     ${lineFour}
     ${lineBase}`)
  }
  else {
    console.log(`
     ${lineBase}
     ${lineOne}
     ${lineTwo}
     ${lineThree}
     ${lineFour}
     ${lineBase}
     ${homepage}`)
  }
}

/**
 * get package information
 */
function getPkgInfo() {
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

/**
 * uninstall pkg
 * @param {string} pkg - package name
 */
export async function uninstallPkg(pkg: string) {
  const print = Print.getInstance()
  try {
    print.startWithDots({ prefixText: 'uninstall running', spinner: spinner() })
    const command = `pnpm uninstall ${pkg}`
    await execaCommand(command)
    spinner().success(`succeed to uninstall ${pkg}!`)
  }
  catch (_e) {
    print.err(`Failed to uninstall ${pkg}.`)
    process.exit(1)
  }
  finally {
    print.clear(true)
  }
}

/**
 * execute instal command
 * @param {string} pkg - package name
 */
export async function importPkg(pkg: string) {
  try {
    const module = await import(pkg)
    return {
      module: module?.default || module?.[pkg],
    }
  }
  catch (_e) {
    Print.getInstance().err(`Failed to import ${pkg}.`)
    process.exit(1)
  }
}

/**
 * execute command
 * @param {string} command - command to be executed
 */
export async function execCommand(command: string) {
  try {
    await execaCommand(command)
  }
  catch (_error) {
    Print.getInstance().err(`Failed to execute '${command}'.`)
    process.exit(1)
  }
}

/**
 * check whether the specified package has been installed
 * @param {any} options - options
 */
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
      const data = await importPkg(p)
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
      const data = await importPkg(p)
      return data
    }
  }
}

/**
 * check whether the package.json file exists
 * @returns {boolean} - result
 */
export function isRootFileExist(file: string): boolean {
  const cwd = process.cwd()
  const path = resolve(cwd, file)
  return fs.existsSync(path)
}

/**
 * get the package.json in object format
 */
export function getPackageJSON() {
  const cwd = process.cwd()
  const path = resolve(cwd, 'package.json')
  if (isRootFileExist('package.json')) {
    try {
      const raw = fs.readFileSync(path, 'utf-8')
      const data = JSON.parse(raw)
      return data
    }
    catch (_e) {
      Print.getInstance().err('Failed to parse package.json.')
      process.exit(1)
    }
  }
}

/**
 * write package.json
 * @param {any} data - content
 */
export async function writePackageJSON(data: AnyKey) {
  try {
    await w('package.json', `${JSON.stringify(data, null, 2)}\n`)
  }
  catch (_error) {
    Print.getInstance().err('Failed to write in package.json.')
    process.exit(1)
  }
}
