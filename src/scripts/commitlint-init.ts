import type { AnyKey } from '@/utils'
import { existsSync } from 'node:fs'
import { writeFile as w } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import yoctoSpinner from 'yocto-spinner'
import { CONFIG_COMMITLINT, CONFIG_COMMITLINT_CZGIT, WRITE_COMMIT_MSG, WRITE_COMMIT_PRE } from '@/constants'
import { checkPackage, execCommand, getExecCommand, getPackageJSON, getRunCommand, isRootFileExist, writePackageJSON } from '@/utils'
import { Print } from '@/utils/print'

export async function init(options: AnyKey) {
  const useCZGit = options.czgit
  const print = Print.getInstance()
  const spinner = yoctoSpinner()

  // check git
  const cwd = process.cwd()
  const path = resolve(cwd, '.git')
  if (!existsSync(path)) {
    spinner.start('git init checking...')
    await execCommand('git init')
    spinner.success('git init down!')
  }

  // start install
  print.startWithDots({ prefixText: 'install running', spinner })
  const pkgs = ['@commitlint/cli', '@commitlint/config-conventional', 'husky', 'lint-staged']
  if (useCZGit)
    pkgs.push('commitizen', 'cz-git')
  for await (const pkg of pkgs)
    await checkPackage({ packageName: pkg, saveMode: '--save-dev' })
  print.clear(true)
  spinner.success('install succeed!')

  // create commitlint config file
  spinner.start('commitlint config running...')
  const name = isRootFileExist('tsconfig.json') ? 'commitlint.config.ts' : 'commitlint.config.js'
  const content = useCZGit ? CONFIG_COMMITLINT_CZGIT : CONFIG_COMMITLINT
  await w(name, content)
  spinner.success('commitlint config succeed!')

  // config husky
  spinner.start('husky config running...')
  const command = getExecCommand()
  await execCommand(`${command} husky init`)
  await w('.husky/pre-commit', WRITE_COMMIT_PRE)
  await w('.husky/commit-msg', WRITE_COMMIT_MSG)
  spinner.success('husky config succeed!')

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
  spinner.success('package.json writting succeed!')

  // lint if exit
  if (await checkPackage({ packageName: 'eslint', needInstall: false })) {
    print.startWithDots({ prefixText: 'lint running', spinner })
    let o = getPackageJSON() as any
    (o.scripts ||= {})['__hubery__:fix'] = `eslint package.json ${name} --fix || true`
    await writePackageJSON(o)
    const runCommand = getRunCommand()
    await execCommand(`${runCommand} hubery:fix`)
    o = getPackageJSON()
    delete o.scripts['__hubery__:fix']
    await writePackageJSON(o)
    print.clear(true)
    spinner.success('lint down!')
  }
}
