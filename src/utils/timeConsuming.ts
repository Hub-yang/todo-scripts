import ora from 'ora'
import pico from 'picocolors'
import { Print } from './print'

type MainCallBack = (options?: AnyKey) => Promise<void>

export async function computeTimeConsuming(cb: MainCallBack, options: AnyKey) {
  const startTime = +new Date()
  const print = Print.getInstance()
  print.log(' ')
  const spinner = ora({
    text: pico.bold(pico.green('Process Start')),
    isEnabled: false,
  }).start()
  print.log(' ')
  ;(spinner as any).isEnabled = true

  await cb(options)

  const endTime = +new Date()
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(1)
  print.log(' ')
  spinner.stopAndPersist({
    text: pico.green(pico.bold('Process Down')) + pico.bold(` in ${elapsedTime}s`),
    symbol: '✨',
  })
  print.log(' ')
}
