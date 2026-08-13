import type { ArgvOptions } from '@/utils'
import process from 'node:process'
import mri from 'mri'
import colors from 'picocolors'
import spinner from 'yocto-spinner'
import { DEFAULT_PKG_NAME } from '@/constants'
import { findScript, renderHelp } from '@/registry'
import { banner, ScriptError } from '@/utils'
import { createPackageManager } from '@/utils/package-manager'

/**
 * 供 bin/index.js 收口使用
 *
 * 不能让 bin 直接 import '@/utils' 的产物：tsdown 把共享代码打进带 hash 的
 * chunk（如 dist/constants-CaIpLqQE.js），文件名每次构建都可能变。
 * dist/main.js 是唯一稳定的入口，所以由它转出去。
 */
export { printErr, ScriptError } from '@/utils'

const { bold, green } = colors

export async function main() {
  banner()
  // 从 argv[2] 起解析，因此 `hubery --help` 和 `hubery <script> --help` 都成立
  const options = mri<ArgvOptions>(process.argv.slice(2), {
    boolean: ['clear', 'czgit', 'help'],
    alias: { h: 'help' },
  })

  if (options.help) {
    console.log(renderHelp())
    return false
  }

  const script = findScript(options._[0])
  if (!script)
    throw new ScriptError('Please use a script.')

  const { init } = await script.load()
  const startTime = Date.now()
  console.log(`⚡️ ${bold(green('Process Start'))}\n`)

  await init(options)

  const endTime = Date.now()
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(1)
  console.log(`\n✨ ${green(bold('Process Down')) + bold(` in ${elapsedTime}s`)}\n`)
  // Check whether to uninstall
  if (options.clear) {
    await createPackageManager().uninstall(DEFAULT_PKG_NAME)
    spinner().success(`clear down!`)
  }
}
