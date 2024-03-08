import process from 'node:process'

interface PrintOptions {
  prefixText: string
  withOra?: boolean
  spinner?: any
}

export class Print {
  interval: NodeJS.Timeout | null = null
  startWithDots({ prefixText = '', withOra, spinner }: PrintOptions) {
    const l = prefixText.length || 0
    const startWith = prefixText

    withOra && spinner?.start(startWith)
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

  clear(withOra?: boolean) {
    if (!withOra) {
      process.stdout.clearLine(0)
      process.stdout.cursorTo(0)
    }
    clearInterval(this.interval as NodeJS.Timeout)
  }
}
