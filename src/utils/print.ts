import process from 'node:process'
import colors from 'picocolors'

interface PrintOptions {
  prefixText: string
  withOra?: boolean
  spinner?: any
}

const { bgYellow, bgRed } = colors

export class Print {
  interval: NodeJS.Timeout | null = null
  private static instance: Print | null = null

  private constructor() {}

  static getInstance() {
    if (!Print.instance)
      Print.instance = new Print()
    return Print.instance
  }

  startWithDots({ prefixText = '', withOra = true, spinner }: PrintOptions) {
    const l = prefixText.length || 0
    const startWith = prefixText

    withOra && spinner.start(startWith)
    this.interval = setInterval(() => {
      if (withOra) {
        spinner.text = prefixText
      }
      else {
        process.stdout.clearLine(0) // 清除当前行
        process.stdout.cursorTo(0) // 将光标移动到行首
        process.stdout.write(`${prefixText}`)
      }
      prefixText += '.'
      if (prefixText.length > l + 3)
        prefixText = startWith
    }, 400)
  }

  log(logMsg: string) {
    console.log(logMsg)
  }

  warn(warnMsg: string) {
    console.log(' ')
    console.log(`${bgYellow(' WARN ')} ${warnMsg}`)
    console.log(' ')
  }

  err(errMsg: string) {
    console.log(' ')
    console.log(`${bgRed(' ERROR ')} ${errMsg}`)
    console.log(' ')
  }

  clear(withOra?: boolean) {
    if (!withOra) {
      process.stdout.clearLine(0)
      process.stdout.cursorTo(0)
    }
    clearInterval(this.interval as NodeJS.Timeout)
  }
}
