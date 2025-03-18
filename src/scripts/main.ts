import process from 'node:process'
import ora from 'ora'
import { consoleInfo } from '../utils/console'
import { Print } from '../utils/print'
import { computeTimeConsuming } from '../utils/timeConsuming'
import { uninstallPackages } from '../utils/uninstall'

// print
consoleInfo()

const scriptsMap = ['commitlint-init']

;(async () => {
  const a = process.argv[2]
  // get options
  const options = process.argv.slice(3)
  const print = Print.getInstance()

  if (a && scriptsMap.includes(a)) {
    const script = await import(`./${a}.mjs`)
    await computeTimeConsuming(script.main, options)
    // Check whether to uninstall
    if (options.includes('--clear')) {
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
