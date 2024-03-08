#!/usr/bin/env node
import { writeFile as w } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { type ModuleDesc, checkPackage } from '../utils/check'
import { Print } from '../utils/print'
import { uninstallPackages } from '../utils/uninstall'
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
const packagesUninstallQueue = new Map()
const log = console.log

async function main() {
  const startTime = +new Date()
  const print = new Print()

  print.startWithDots({ prefixText: 'packages checking' })
  const { module: ora } = await checkPackage({ packageName: 'ora', needImport: true }) as ModuleDesc
  packagesUninstallQueue.set('ora', true)
  const { module: chalk } = await checkPackage({ packageName: 'chalk', needImport: true }) as ModuleDesc
  packagesUninstallQueue.set('chalk', true)
  print.clear()

  log(' ')
  const spinner = ora({
    text: chalk.bold('Process Start'),
    isEnabled: false,
  }).start()
  log(' ')
  spinner.isEnabled = true

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

  if (packagesUninstallQueue.size > 0) {
    print.startWithDots({ prefixText: 'process dependencies uninstalling', withOra: true, spinner })
    for await (const pkg of packagesUninstallQueue)
      await uninstallPackages(pkg[0])
    print.clear(true)
    spinner.succeed('uninstall succeed!')
  }

  // 检查执行eslint
  if (await checkPackage({ packageName: 'eslint', needInstall: false })) {
    print.startWithDots({ prefixText: 'lint running', withOra: true, spinner })
    let o = getPackageJSON() as any
    (o.scripts ||= {})['hubery:fix'] = `eslint . --fix || true`
    await writePackageJSON(o)
    await execCommand('pnpm run hubery:fix')
    o = getPackageJSON()
    delete o.scripts['hubery:fix']
    await writePackageJSON(o)
    print.clear(true)
    spinner.succeed('lint down!')
  }

  const endTime = +new Date()
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(1)

  log(' ')
  spinner.stopAndPersist({
    text: chalk.green.bold('Process Down') + chalk.bold(` in ${elapsedTime}s`),
    symbol: '-',
  })
  log(' ')
}

main()
