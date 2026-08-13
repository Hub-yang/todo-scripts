import type { ArgvOptions, PackageJsonLike } from '@/utils'
import type { PackageManager } from '@/utils/package-manager'
import { existsSync } from 'node:fs'
import { writeFile as w } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import yoctoSpinner from 'yocto-spinner'
import { CONFIG_COMMITLINT, CONFIG_COMMITLINT_CZGIT } from '@/constants'
import { execCommand, getPackageJSON, isInstalled, isTsProject, printWarn, writePackageJSON } from '@/utils'
import { createPackageManager } from '@/utils/package-manager'

interface HookFile {
  path: string
  content: string
}

export interface SetupPlan {
  /** 需要确保安装的依赖 */
  packages: string[]
  /** 要生成的 commitlint 配置文件 */
  configFile: { name: string, content: string }
  /** 要写入的 husky 钩子 */
  hooks: HookFile[]
}

/**
 * 决定这次要生成什么 —— 纯函数，不碰文件系统、不执行命令
 *
 * 注意这里只涵盖「能提前算出来」的决定。husky 钩子是否跳过写入
 * 不在其列：那个判断依赖 `husky init` 执行后的副作用，只能留在 init() 里。
 */
export function planSetup(
  options: ArgvOptions,
  env: { isTsProject: boolean, pm: PackageManager },
): SetupPlan {
  const useCZGit = Boolean(options.czgit)
  const packages = ['@commitlint/cli', '@commitlint/config-conventional', 'husky', 'lint-staged']
  if (useCZGit)
    packages.push('commitizen', 'cz-git')

  return {
    packages,
    configFile: {
      name: env.isTsProject ? 'commitlint.config.ts' : 'commitlint.config.js',
      content: useCZGit ? CONFIG_COMMITLINT_CZGIT : CONFIG_COMMITLINT,
    },
    hooks: [
      // 钩子是 shell 脚本，写进去的是命令字符串而不是去执行它，所以用 formatExec
      { path: '.husky/pre-commit', content: env.pm.formatExec('lint-staged') },
      { path: '.husky/commit-msg', content: env.pm.formatExec('commitlint --edit "$1"') },
    ],
  }
}

/**
 * 算出改写后的 package.json —— 纯函数，不修改传入对象
 */
export function patchPackageJSON(pkg: PackageJsonLike, options: ArgvOptions): PackageJsonLike {
  const scripts: Record<string, string> = { ...pkg.scripts, commitlint: 'commitlint --edit' }
  const patched: PackageJsonLike = {
    ...pkg,
    scripts,
    'lint-staged': { '*': 'eslint . --fix' },
  }

  if (options.czgit) {
    scripts.cz = 'git cz'
    // 与改动前保持一致：整体覆盖 config 字段
    patched.config = { commitizen: { path: 'node_modules/cz-git' } }
  }
  else {
    delete scripts.cz
    if (pkg.config) {
      const { commitizen: _commitizen, ...rest } = pkg.config
      patched.config = rest
    }
  }

  return patched
}

/**
 * 钩子文件已存在就跳过，避免覆盖用户自己的配置
 */
async function writeHookIfAbsent(cwd: string, hook: HookFile) {
  // 检查和写入用同一个解析后的路径，不混用相对路径
  const target = resolve(cwd, hook.path)
  if (existsSync(target)) {
    printWarn(`${hook.path} already exists, skipped.`)
    return
  }
  await w(target, hook.content)
}

export async function init(options: ArgvOptions) {
  const spinner = yoctoSpinner()
  // 包管理器与 monorepo 判定在这里解析一次，后续所有命令都复用
  const pm = createPackageManager()
  const plan = planSetup(options, { isTsProject: isTsProject(), pm })

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
  await pm.ensureInstalled(plan.packages, { dev: true })
  spinner.success('install succeed!')

  // create commitlint config file
  spinner.start('commitlint config running...')
  const { name, content } = plan.configFile
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
  await pm.exec('husky init')
  for (const hook of plan.hooks)
    await writeHookIfAbsent(cwd, hook)
  spinner.success('husky config succeed!')

  // write in package.json
  spinner.start('package.json writing...')
  await writePackageJSON(patchPackageJSON(getPackageJSON(), options))
  spinner.success('package.json writing succeed!')

  // lint if exit
  if (isInstalled('eslint')) {
    spinner.start('lint running')
    // 直接执行项目本地的 eslint，不再往用户 package.json 里塞临时脚本；
    // 格式化失败不影响初始化结果，配置文件此时已经写好了
    await pm.exec(`eslint package.json ${name} --fix`, { allowFailure: true })
    spinner.success('lint down!')
  }
}
