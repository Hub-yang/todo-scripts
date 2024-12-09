import type { AnyKey } from '../../global'
import chalk from 'chalk'
import ora from 'ora'
import { Print } from './print'

type MainCallBack = (options?: AnyKey) => Promise<void>

export async function computeTimeConsuming(cb: MainCallBack, options: AnyKey) {
  const startTime = +new Date()
  const print = Print.getInstance()
  print.log(' ')
  const spinner = ora({
    text: chalk.bold('Process Start'),
    isEnabled: false,
  }).start()
  print.log(' ')
  ;(spinner as any).isEnabled = true

  await cb(options)

  const endTime = +new Date()
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(1)
  print.log(' ')
  spinner.stopAndPersist({
    text: chalk.green.bold('Process Down') + chalk.bold(` in ${elapsedTime}s`),
    symbol: '✨',
  })
  print.log(' ')
}
