import { existsSync } from 'node:fs'
import { writeFile as w } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import ora from 'ora'
import { CONFIG_COMMITLINT, CONFIG_COMMITLINT_CZGIT, WRITE_COMMIT_MSG, WRITE_COMMIT_PRE } from '../constants'
import { checkPackage } from '../utils/check'
import { execCommand } from '../utils/exec'
import { getPackageJSON, writePackageJSON } from '../utils/fs'
import { Print } from '../utils/print'

export async function main(options: AnyKey) {
  const useCZGit = options.czgit
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
  const pkgs: string[] = ['@commitlint/cli', '@commitlint/config-conventional', 'husky', 'lint-staged']
  if (useCZGit)
    pkgs.push('commitizen', 'cz-git')
  for await (const pkg of pkgs)
    await checkPackage({ packageName: pkg, saveMode: '--save-dev' })
  print.clear(true)
  spinner.succeed('install succeed!')

  // create commitlint.config.js and write in options
  spinner.start('commitlint config running...')
  await w('commitlint.config.js', useCZGit ? CONFIG_COMMITLINT_CZGIT : CONFIG_COMMITLINT)
  spinner.succeed('commitlint config succeed!')

  // config husky
  spinner.start('husky config running...')
  await execCommand('npx husky init')
  await w('.husky/pre-commit', WRITE_COMMIT_PRE)
  await w('.husky/commit-msg', WRITE_COMMIT_MSG)
  spinner.succeed('husky config succeed!')

  // write in package.json
  spinner.start('package.json writting...')
  const o = getPackageJSON() as any
  (o.scripts ||= {}).commitlint = 'commitlint --edit'
  o['lint-staged'] = {
    '*': 'eslint . --fix',
  }
  if (useCZGit) {
    o.config = {
      commitizen: {
        path: 'node_modules/cz-git',
      },
    }
    o.scripts.cz = 'git cz'
  }
  else {
    if (o.config?.commitizen) {
      delete o.config.commitizen
    }
    if (o.scripts?.cz) {
      delete o.scripts.cz
    }
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
