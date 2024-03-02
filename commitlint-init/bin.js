#!/usr/bin/env node

import process from 'node:process'
import { exec } from 'node:child_process'
import { readFile as r, writeFile as w } from 'node:fs/promises'
import { promisify } from 'node:util'
import chalk from 'chalk'

const e = promisify(exec)
// eslint-disable-next-line no-console
const log = console.log
const RUN_INSTALL = 'pnpm install @commitlint/{cli,config-conventional} husky lint-staged -D'
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

async function init() {
  const a = process.argv[1]
  if (/commitlint-init/.test(a)) {
    // install commitlint husky and lint-staged
    const { stdout, stderr } = await e(RUN_INSTALL)
    if (stderr)
      return chalk.red(stderr)
    log(stdout)
    log(`${chalk.green('✔')} ${chalk.inverse.bold('install success!')}`)

    // create commitlint.config.js and write in options
    await w('commitlint.config.js', CONFIG_COMMITLINT)
    log(`${chalk.green('✔')} ${chalk.inverse.bold('config commitlint success!')}`)

    // run ‘npx husky init’
    await e(RUN_HUSKY_INIT)
    // write in
    await w('.husky/commit-msg', WRITE_COMMIT_MSG)
    await w('.husky/pre-commit', WRITE_COMMIT_PRE)
    log(`${chalk.green('✔')} ${chalk.inverse.bold('config husky success!')}`)

    // write in package.json
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
    await w(n, JSON.stringify(o, null, 2))

    log(`${chalk.green('✔')} ${chalk.inverse.bold('config package.json success!\n')}`)
    log('process down!')
  }
}

init()
