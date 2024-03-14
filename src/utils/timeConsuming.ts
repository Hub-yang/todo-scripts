import ora from 'ora'
import chalk from 'chalk'
import { Print } from './print'

type MainCallBack = () => Promise<void>

export async function computeTimeConsuming(cb: MainCallBack) {
  const startTime = +new Date()
  const print = Print.getInstance()
  print.log(' ')
  const spinner = ora({
    text: chalk.bold('Process Start'),
    isEnabled: false,
  }).start()
  print.log(' ')
  ;(spinner as any).isEnabled = true

  await cb()

  const endTime = +new Date()
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(1)
  print.log(' ')
  spinner.stopAndPersist({
    text: chalk.green.bold('Process Down') + chalk.bold(` in ${elapsedTime}s`),
    symbol: '✨',
  })
  print.log(' ')
}
