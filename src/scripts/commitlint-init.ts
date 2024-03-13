#!/usr/bin/env node
import { writeFile as w } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import ora from 'ora'
import { checkPackage } from '../utils/check'
import { Print } from '../utils/print'
import { getPackageJSON, writePackageJSON } from '../utils/fs'
import { execCommand } from '../utils/exec'

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

export async function main() {
  const print = Print.getInstance()
  const spinner = ora()

  // check git
  const cwd = process.cwd()
  const path = resolve(cwd, '.git')
  if (!existsSync(path)) {
    spinner.start('git init checking...')
    await execCommand('git init')
    spinner.succeed('git init down!')
  }

  // start install
  print.startWithDots({ prefixText: 'install running', withOra: true, spinner })
  for await (const pkg of ['@commitlint/cli', '@commitlint/config-conventional', 'husky', 'lint-staged'])
    await checkPackage({ packageName: pkg, saveMode: '--save-dev' })
  print.clear(true)
  spinner.succeed('install succeed!')

  // create commitlint.config.js and write in options
  spinner.start('commitlint config running...')
  await w('commitlint.config.js', CONFIG_COMMITLINT)
  spinner.succeed('commitlint config succeed!')

  // config husky
  spinner.start('husky config running...')
  await execCommand('npx husky init')
  await w('.husky/commit-msg', WRITE_COMMIT_MSG)
  await w('.husky/pre-commit', WRITE_COMMIT_PRE)
  spinner.succeed('husky config succeed!')

  // write in package.json
  spinner.start('package.json writting...')
  const o = getPackageJSON() as any
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
  await writePackageJSON(o)
  spinner.succeed('package.json writting succeed!')

  // lint if exit
  if (await checkPackage({ packageName: 'eslint', needInstall: false })) {
    print.startWithDots({ prefixText: 'lint running', withOra: true, spinner })
    let o = getPackageJSON() as any
    (o.scripts ||= {})['hubery:fix'] = `eslint package.json commitlint.config.js --fix || true`
    await writePackageJSON(o)
    await execCommand('pnpm run hubery:fix')
    o = getPackageJSON()
    delete o.scripts['hubery:fix']
    await writePackageJSON(o)
    print.clear(true)
    spinner.succeed('lint down!')
  }
}
