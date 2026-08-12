import type { ArgvOptions } from '@/utils'
import { existsSync } from 'node:fs'
import { writeFile as w } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import yoctoSpinner from 'yocto-spinner'
import { CONFIG_COMMITLINT, CONFIG_COMMITLINT_CZGIT, getCommitMsgHook, getCommitPreHook } from '@/constants'
import { checkPackage, execCommand, getExecCommand, getPackageJSON, getRunCommand, isTsProject, printWarn, writePackageJSON } from '@/utils'

export async function init(options: ArgvOptions) {
  const useCZGit = options.czgit
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
  spinner.start('install running')
  const pkgs = ['@commitlint/cli', '@commitlint/config-conventional', 'husky', 'lint-staged']
  if (useCZGit)
    pkgs.push('commitizen', 'cz-git')
  for await (const pkg of pkgs)
    await checkPackage({ packageName: pkg, saveMode: '--save-dev' })
  spinner.success('install succeed!')

  // create commitlint config file
  spinner.start('commitlint config running...')
  const name = isTsProject() ? 'commitlint.config.ts' : 'commitlint.config.js'
  const content = useCZGit ? CONFIG_COMMITLINT_CZGIT : CONFIG_COMMITLINT
  if (existsSync(resolve(cwd, name))) {
    spinner.stop()
    printWarn(`${name} already exists, skipped.`)
  }
  else {
    await w(name, content)
    spinner.success('commitlint config succeed!')
  }

  // config husky
  spinner.start('husky config running...')
  await execCommand(`${getExecCommand()}husky init`)
  if (existsSync(resolve(cwd, '.husky/pre-commit'))) {
    printWarn('.husky/pre-commit already exists, skipped.')
  }
  else {
    await w('.husky/pre-commit', getCommitPreHook())
  }
  if (existsSync(resolve(cwd, '.husky/commit-msg'))) {
    printWarn('.husky/commit-msg already exists, skipped.')
  }
  else {
    await w('.husky/commit-msg', getCommitMsgHook())
  }
  spinner.success('husky config succeed!')

  // write in package.json
  spinner.start('package.json writing...')
  const o = getPackageJSON()!
  ;(o.scripts ||= {}).commitlint = 'commitlint --edit'
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
  spinner.success('package.json writing succeed!')

  // lint if exit
  if (await checkPackage({ packageName: 'eslint', needInstall: false })) {
    spinner.start('lint running')
    let o = getPackageJSON()!
    const LINT_SCRIPT = '__hubery__:fix'
    ;(o.scripts ||= {})[LINT_SCRIPT] = `eslint package.json ${name} --fix || true`
    await writePackageJSON(o)
    const runCommand = getRunCommand()
    await execCommand(`${runCommand} ${LINT_SCRIPT}`)
    o = getPackageJSON()!
    delete o.scripts![LINT_SCRIPT]
    await writePackageJSON(o)
    spinner.success('lint down!')
  }
}
