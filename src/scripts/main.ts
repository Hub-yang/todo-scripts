import process from 'node:process'
import mri from 'mri'
import colors from 'picocolors'
import spinner from 'yocto-spinner'
import { DEFAULT_PKG_NAME, HELP_MESSAGE } from '@/constants'
import { banner, uninstallPkg } from '@/utils'
import { Print } from '@/utils/print'

interface ArgvOptions {
  clear?: boolean
  czgit?: boolean
  help?: boolean
}

const { bold, green } = colors
const { warn } = Print.getInstance()

async function main() {
  const scriptsMap: string[] = ['commitlint-init']
  const script = process.argv[2]
  const options = mri<ArgvOptions>(process.argv.slice(3), {
    boolean: ['clear', 'czgit', 'help'],
    alias: { h: 'help' },
  })

  if (options.help) {
    console.log(HELP_MESSAGE)
    return false
  }

  if (script && scriptsMap.includes(script)) {
    const { init } = await import(`./${script}.js`)
    const startTime = +new Date()
    console.log(`\n⚡️ ${bold(green('Process Start'))}\n`)

    await init(options)

    const endTime = +new Date()
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(1)
    console.log(`\n✨ ${green(bold('Process Down')) + bold(` in ${elapsedTime}s`)}\n`)
    // Check whether to uninstall
    if (options.clear) {
      await uninstallPkg(DEFAULT_PKG_NAME)
      spinner().success(`clear down!`)
      process.exit()
    }
  }
  else {
    warn('Please use a script.')
    process.exit(1)
  }
}

banner()
main()
