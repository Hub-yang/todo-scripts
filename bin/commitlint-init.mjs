#!/usr/bin/env node

import { exec } from 'node:child_process'
import { readFile as r, writeFile as w } from 'node:fs/promises'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'

const e = promisify(exec)
// eslint-disable-next-line no-console
const log = console.log
async function checkPackage(moduleName, installMode = '') {
  const m = moduleName
  const t = installMode
  if (!existsSync(`./node_modules/${m}`))
    await e(`pnpm install ${m} ${t}`)
  const module = await import(m)
  return module?.default || module[m]
}

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
}
`
// eslint-disable-next-line no-template-curly-in-string
const WRITE_COMMIT_MSG = '#!/bin/sh\n. "$(dirname "$0")/_/husky.sh"\n\npnpm commitlint ${1}'
const WRITE_COMMIT_PRE = `#!/bin/sh\n. "$(dirname "$0")/_/husky.sh"\n\npnpm lint-staged`

async function init() {
  const startTime = new Date()
  // check installed chalk or not
  const chalk = await checkPackage('chalk')
  const ora = await checkPackage('ora')

  log(' ')
  const spinner = ora({
    text: chalk.bold('Process Start'),
    isEnabled: false,
  }).start()
  log(' ')

  spinner.isEnabled = true
  spinner.start('install running...')
  // install commitlint husky and lint-staged
  const { stderr } = await e(RUN_INSTALL)
  if (stderr)
    return spinner.fail(stderr)

  spinner.succeed('install succeed!')

  // create commitlint.config.js and write in options
  spinner.start('commitlint config running...')
  await w('commitlint.config.js', CONFIG_COMMITLINT)

  spinner.succeed('commitlint config succeed!')

  // run ‘npx husky init’
  spinner.start('husky config running...')
  await e(RUN_HUSKY_INIT)
  // write in
  await w('.husky/commit-msg', WRITE_COMMIT_MSG)
  await w('.husky/pre-commit', WRITE_COMMIT_PRE)

  spinner.succeed('husky config succeed!')

  // write in package.json
  spinner.start('package.json writting...')
  const n = 'package.json'
  const f = await r(n)
  const o = JSON.parse(f)
    ;(o.scripts ||= {}).commitlint = 'commitlint --edit'
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
  const endTime = new Date()
  const elapsedTime = (endTime - startTime) / 1000

  log(' ')
  spinner.stopAndPersist({
    text: chalk.bold(`Process Down in ${elapsedTime}s`),
    symbol: '-',
  })
  log(' ')
}

init()
