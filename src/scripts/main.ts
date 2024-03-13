// match scripts
import process from 'node:process'
import ora from 'ora'
import chalk from 'chalk'
import { Print } from '../utils/print'
import { uninstallPackages } from '../utils/uninstall'

const scriptsMap = ['commitlint-init']
;(async () => {
  const a = process.argv[2]
  const option = process.argv[3]
  const startTime = +new Date()
  const print = Print.getInstance()
  if (a && scriptsMap.includes(a)) {
    print.log(' ')
    const spinner = ora({
      text: chalk.bold('Process Start'),
      isEnabled: false,
    }).start()
    print.log(' ')
    ;(spinner as any).isEnabled = true

    const script = await import(`./${a}.mjs`)
    await script.main()

    const endTime = +new Date()
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(1)
    print.log(' ')
    spinner.stopAndPersist({
      text: chalk.green.bold('Process Down') + chalk.bold(` in ${elapsedTime}s`),
      symbol: '-',
    })
    print.log(' ')

    // Check if uninstallation is required
    if (option === '--clear')
      await uninstallPackages('@huberyyang/todo-scripts')
  }
  else {
    console.warn('\nPlease use a script')
    process.exit(1)
  }
  // 通过--clear判断是否需要卸载
})()
