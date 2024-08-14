import process from 'node:process'
import { uninstallPackages } from '../utils/uninstall'
import { computeTimeConsuming } from '../utils/timeConsuming'
import { Print } from '../utils/print'
import { consoleInfo } from '../utils/console'

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
      process.exit()
    }
  }
  else {
    print.warn('Please use a script.')
    process.exit(1)
  }
})()
