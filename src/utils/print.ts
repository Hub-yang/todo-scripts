import process from 'node:process'

interface PrintOptions {
  prefixText: string
  withOra?: boolean
  spinner?: any
}

export class Print {
  interval: NodeJS.Timeout | null = null
  private static instance: Print | null = null

  private constructor() {
    // 私有构造函数，确保不能在外部创建实例
  }

  static getInstance() {
    if (!Print.instance)
      Print.instance = new Print()
    return Print.instance
  }

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

  log(text: any) {
    console.log(text)
  }

  clear(withOra?: boolean) {
    if (!withOra) {
      process.stdout.clearLine(0)
      process.stdout.cursorTo(0)
    }
    clearInterval(this.interval as NodeJS.Timeout)
  }
}
