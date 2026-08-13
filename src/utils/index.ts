/* eslint-disable regexp/no-unused-capturing-group */
import fs from 'node:fs'
import { writeFile as w } from 'node:fs/promises'
import path, { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { execaCommand } from 'execa'
import colors from 'picocolors'
import terminalLink from 'terminal-link'
import { parse as parseYaml } from 'yaml'
import { DEFAULT_PKG_NAME, REPO_URL } from '@/constants'

export interface ArgvOptions {
  clear?: boolean
  czgit?: boolean
  help?: boolean
}

export interface PackageJsonLike {
  'scripts'?: Record<string, string>
  'dependencies'?: Record<string, string>
  'devDependencies'?: Record<string, string>
  'lint-staged'?: Record<string, string>
  'config'?: {
    // cz-git 在 path 之外还支持 alias / messages / types / scopes 等字段
    commitizen?: { path: string, [key: string]: any }
    [key: string]: any
  }
  [key: string]: any
}

const { bold, italic, blue, dim, bgYellow, bgRed } = colors

/**
 * 脚本执行过程中的预期内失败
 *
 * 叶子函数只负责抛出它，不负责打印、更不负责结束进程；
 * 收口在 bin/index.js —— 那里是唯一调用 process.exit 的地方。
 * 非 ScriptError 的错误视为真实 bug，交给 node 打完整堆栈。
 */
export class ScriptError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ScriptError'
  }
}

/**
 * print warning message
 */
export function printWarn(msg: string) {
  console.log(' ')
  console.log(`${bgYellow(' WARN ')} ${msg}`)
  console.log(' ')
}

/**
 * print error message
 */
export function printErr(msg: string) {
  console.log(' ')
  console.log(`${bgRed(' ERROR ')} ${msg}`)
  console.log(' ')
}

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

  let banner
  if (isSupportLink) {
    banner
      = `${lineBase}
${lineOne}
${lineTwo}
${lineThree}
${lineFour}
${lineBase}\n`
  }
  else {
    banner
      = `\n${lineBase}
${lineOne}
${lineTwo}
${lineThree}
${lineFour}
${lineBase}
${homepage}\n`
  }

  console.log(banner)
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
  catch {
    return {}
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
  catch (e) {
    throw new ScriptError(`Failed to execute '${command}'.`, { cause: e })
  }
}

/**
 * 读取 package.json，文件不存在时返回 undefined
 *
 * 与 getPackageJSON 的区别只在于吞掉「文件不存在」这一种情况；
 * 内容解析失败仍然抛错 —— 那是真实错误，不该被静默
 * @returns {PackageJsonLike | undefined} - package.json 内容
 */
function tryReadPackageJSON(): PackageJsonLike | undefined {
  return isRootFileExist('package.json') ? getPackageJSON() : undefined
}

/**
 * 项目是否已经具备这个依赖
 *
 * 需要同时满足：node_modules 下确实存在，且 package.json 里声明过。
 * 只看 node_modules 会被提升上来的传递依赖骗过 —— 依赖并没有写进
 * package.json，却被判定为「已安装」而跳过安装；只看声明则可能拿到
 * 一个没有真正装上的包。
 * @param {string} pkg - package name
 * @returns {boolean} - result
 */
export function hasDependency(pkg: string): boolean {
  if (!isRootFileExist(`node_modules/${pkg}`))
    return false

  const json = tryReadPackageJSON()
  return Boolean(json?.dependencies?.[pkg] || json?.devDependencies?.[pkg])
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
 * check whether the project is a monorepo
 * by detecting a non-empty `packages` field in pnpm-workspace.yaml
 * or a non-empty `workspaces` field in package.json
 * @returns {boolean} - result
 */
export function isMonorepo(): boolean {
  // 谓词不应该终止流程：没有 package.json 时判定为非 monorepo，
  // 而不是让 getPackageJSON 的「文件不存在」错误从这里抛出去
  const pkg = tryReadPackageJSON()
  if (Array.isArray(pkg?.workspaces) && pkg.workspaces.length > 0)
    return true

  if (!isRootFileExist('pnpm-workspace.yaml'))
    return false

  try {
    const raw = fs.readFileSync(resolve(process.cwd(), 'pnpm-workspace.yaml'), 'utf-8')
    const data = parseYaml(raw) as { packages?: string[] } | undefined
    return Array.isArray(data?.packages) && data.packages.length > 0
  }
  catch {
    return false
  }
}

/**
 * check whether the project is a TypeScript project
 * by scanning for tsconfig*.json files in the project root
 * @returns {boolean} - result
 */
export function isTsProject(): boolean {
  const cwd = process.cwd()
  const files = fs.readdirSync(cwd)
  return files.some(file => /^tsconfig(\..*)?\.json$/.test(file))
}

/**
 * get the package.json in object format
 *
 * 文件不存在或解析失败一律抛错，因此调用方拿到的一定是有效对象、无需再判空
 */
export function getPackageJSON(): PackageJsonLike {
  const cwd = process.cwd()
  const path = resolve(cwd, 'package.json')
  if (!isRootFileExist('package.json'))
    throw new ScriptError('Cannot find package.json in the current directory.')

  try {
    const raw = fs.readFileSync(path, 'utf-8')
    const data = JSON.parse(raw)
    return data
  }
  catch (e) {
    throw new ScriptError('Failed to parse package.json.', { cause: e })
  }
}

/**
 * write package.json
 * @param {PackageJsonLike} data - content
 */
export async function writePackageJSON(data: PackageJsonLike) {
  try {
    await w('package.json', `${JSON.stringify(data, null, 2)}\n`)
  }
  catch (e) {
    throw new ScriptError('Failed to write in package.json.', { cause: e })
  }
}
