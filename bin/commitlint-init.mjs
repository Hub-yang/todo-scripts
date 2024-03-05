#!/usr/bin/env node

import { exec } from 'node:child_process'
import { readFile as r, writeFile as w } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { promisify } from 'node:util'
import p from 'node:process'

const e = promisify(exec)

const RUN_INSTALL = 'pnpm install @commitlint/{cli,config-conventional} husky lint-staged --save-dev'
const RUN_HUSKY_INIT = 'npx husky init'
const CONFIG_COMMITLINT
= `export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'build',
      'ci',
      'docs',
      'feat',
      'merge',
      'fix',
      'perf',
      'refactor',
      'style',
      'test',
      'revert',
      'update',
      'chore',
    ]],
  },
}`
// eslint-disable-next-line no-template-curly-in-string
const WRITE_COMMIT_MSG = '#!/bin/sh\n. "$(dirname "$0")/_/husky.sh"\n\npnpm commitlint ${1}'
const WRITE_COMMIT_PRE = `#!/bin/sh\n. "$(dirname "$0")/_/husky.sh"\n\npnpm lint-staged`

async function checkPackage(packageName, installMode = '') {
  let shouldUninstall = true
  const p = packageName
  const t = installMode
  const isExist = existsSync(`./node_modules/${p}`)
  if (!isExist)
    await e(`pnpm install ${p} ${t}`)
  else
    shouldUninstall = false
  const module = await import(p)
  return {
    module: module?.default || module[p],
    shouldUninstall,
  }
}

async function handleUninstall(moduleName) {
  await e(`pnpm uninstall ${moduleName}`)
}

class Print {
  startWithDots(prefixText = '') {
    const l = prefixText.length || 0
    const startWith = prefixText
    this.interval = setInterval(() => {
      p.stdout.clearLine() // 清除当前行
      p.stdout.cursorTo(0) // 将光标移动到行首
      p.stdout.write(`${prefixText}`)
      prefixText += '.'
      if (prefixText.length > l + 3)
        prefixText = startWith
    }, 400)
  }

  log(text) {
    // eslint-disable-next-line no-console
    console.log(text)
  }

  clear() {
    clearInterval(this.interval)
    p.stdout.clearLine()
    p.stdout.cursorTo(0)
  }
}

async function main() {
  const startTime = new Date()
  const print = new Print()
  print.startWithDots('packages checking')
  const { module: ora, shouldUninstall: oraShouldBeUninstall } = await checkPackage('ora')
  const { module: chalk, shouldUninstall: chalkShouldBeUninstall } = await checkPackage('chalk')
  print.clear()
  print.log(' ')
  const spinner = ora({
    text: chalk.bold('Process Start'),
    isEnabled: false,
  }).start()
  print.log(' ')
  spinner.isEnabled = true
  spinner.start('install running...')
  // install commitlint husky and lint-staged
  const { stderr } = await e(RUN_INSTALL)
  if (stderr)
    spinner.warn(`install warning →` + `\n${stderr}`)
  spinner.succeed('install succeed!')

  // create commitlint.config.js and write in options
  spinner.start('commitlint config running...')
  await w('commitlint.config.js', CONFIG_COMMITLINT)
  spinner.succeed('commitlint config succeed!')

  // config husky
  spinner.start('husky config running...')
  await e(RUN_HUSKY_INIT)
  await w('.husky/commit-msg', WRITE_COMMIT_MSG)
  await w('.husky/pre-commit', WRITE_COMMIT_PRE)
  spinner.succeed('husky config succeed!')

  // write in package.json
  spinner.start('package.json writting...')
  const n = 'package.json'
  const f = await r(n)
  const o = JSON.parse(f);
  (o.scripts ||= {}).commitlint = 'commitlint --edit'
  o.husky = {
    hooks: {
      'pre-commit': 'lint-staged',
      'commit-msg': 'commitlint --edit $1',
    },
  }
  o['lint-staged'] = {
    '*': 'eslint . --fix',
  }
  await w(n, `${JSON.stringify(o, null, 2)}\n`)
  spinner.succeed('package.json writting succeed!')

  if (oraShouldBeUninstall || chalkShouldBeUninstall) {
    spinner.start('process dependencies uninstalling...')
    chalkShouldBeUninstall && await handleUninstall('chalk')
    oraShouldBeUninstall && await handleUninstall('ora')
    spinner.succeed('uninstall succeed!')
  }

  // 检查执行eslint
  if (existsSync('./node_modules/eslint')) {
    spinner.start('lint running...')
    const n = 'package.json'
    const f = await r(n)
    let o = JSON.parse(f);
    (o.scripts ||= {})['hubery:fix'] = `eslint . --fix || true`
    await w(n, `${JSON.stringify(o, null, 2)}\n`)
    await e('pnpm run hubery:fix')
    o = JSON.parse(await r(n))
    delete o.scripts['hubery:fix']
    await w(n, `${JSON.stringify(o, null, 2)}\n`)
    spinner.succeed('lint down!')
  }

  const endTime = new Date()
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(1)

  print.log(' ')
  spinner.stopAndPersist({
    text: chalk.green.bold('Process Down') + chalk.bold(` in ${elapsedTime}s`),
    symbol: '-',
  })
  print.log(' ')
}

main()
