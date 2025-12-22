import process from 'node:process'
import mri from 'mri'
import ora from 'ora'
import { consoleInfo } from '../utils/console'
import { Print } from '../utils/print'
import { computeTimeConsuming } from '../utils/timeConsuming'
import { uninstallPackages } from '../utils/uninstall'

declare type Scripts = Array<'commitlint-init'>
interface ArgvOptions {
  clear?: boolean
  czgit?: boolean
}

// print
consoleInfo()

const scriptsMap: Scripts = ['commitlint-init']

;(async () => {
  const a = process.argv[2]
  // get options
  const options = mri<ArgvOptions>(process.argv.slice(3), {
    boolean: ['clear', 'czgit'],
  })
  const print = Print.getInstance()

  if (a && (scriptsMap as any[]).includes(a)) {
    const script = await import(`./${a}.mjs`)
    await computeTimeConsuming(script.main, options)
    // Check whether to uninstall
    if (options.clear) {
      await uninstallPackages('@huberyyang/todo-scripts')
      ora().succeed(`clear down!`)
      process.exit()
    }
  }
  else {
    print.warn('Please use a script.')
    process.exit(1)
  }
})()
