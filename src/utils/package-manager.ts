import process from 'node:process'
import yoctoSpinner from 'yocto-spinner'
import { execCommand, isInstalled, isMonorepo, ScriptError } from '@/utils'

export interface PkgInfo {
  name: string
  version: string
}

export interface PackageManager {
  /** 包管理器名称，如 pnpm */
  readonly name: string
  /** 装上还没装的那些包，全都装过了就什么也不做 */
  ensureInstalled: (pkgs: string[], options?: { dev?: boolean }) => Promise<void>
  /** 卸载一个包 */
  uninstall: (pkg: string) => Promise<void>
  /**
   * 执行项目本地的 bin，如 exec('husky init')
   *
   * allowFailure 表示调用方不关心这条命令的成败（例如收尾的代码格式化），
   * 失败时不抛错、不中断后续流程
   */
  exec: (command: string, options?: { allowFailure?: boolean }) => Promise<void>
  /** 把一条本地 bin 命令渲染成字符串，供写入 husky hook 这类 shell 脚本 */
  formatExec: (command: string) => string
}

interface PkgManagerSpec {
  /** 安装子命令 */
  add: string
  /** 装为开发依赖的标志 */
  devFlag: string
  /** 卸载子命令 */
  remove: string
  /** monorepo 根目录安装/卸载的标志，不支持的包管理器留空 */
  rootFlag?: string
  /** 执行本地 bin 的命令拼法，各家差异较大，所以直接给一个函数 */
  exec: (command: string) => string
}

/**
 * 各包管理器的差异集中在这张表里，调用方不需要知道任何一条
 *
 * npm / pnpm / yarn 的写法已实测验证；bun / deno 依据各自官方文档编写，
 * 未在本机验证（bun 装包在受限网络下会挂起）。
 */
const SPECS: Record<string, PkgManagerSpec> = {
  npm: {
    add: 'install',
    devFlag: '--save-dev',
    remove: 'uninstall',
    exec: command => `npx ${command}`,
  },
  pnpm: {
    add: 'add',
    devFlag: '--save-dev',
    remove: 'remove',
    rootFlag: '-w',
    exec: command => `pnpm exec ${command}`,
  },
  yarn: {
    // yarn v1 明确拒绝 `yarn install <pkg>`，且开发依赖标志是 --dev 而非 --save-dev
    add: 'add',
    devFlag: '--dev',
    remove: 'remove',
    rootFlag: '-W',
    exec: command => `yarn ${command}`,
  },
  bun: {
    add: 'add',
    devFlag: '--dev',
    remove: 'remove',
    exec: command => `bunx ${command}`,
  },
  deno: {
    add: 'add',
    devFlag: '--dev',
    remove: 'remove',
    // npm: 前缀直接贴在 bin 名前面，中间没有空格
    exec: command => `deno run -A npm:${command}`,
  },
}

/**
 * get the current package manager from user agent
 * @returns {PkgInfo} package manager info, include name and version
 */
export function getPkgManager(): PkgInfo | undefined {
  const userAgent = process.env.npm_config_user_agent
  if (!userAgent) {
    return undefined
  }

  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

/**
 * 创建当前项目的包管理器
 *
 * 包管理器种类与 monorepo 判定都只在这里解析一次，
 * 之后的每次调用不再重复读文件系统
 */
export function createPackageManager(): PackageManager {
  const detected = getPkgManager()?.name ?? 'npm'
  // 认不出来的包管理器一律按 npm 处理
  const name = detected in SPECS ? detected : 'npm'
  const spec = SPECS[name]
  const rootFlag = spec.rootFlag && isMonorepo() ? ` ${spec.rootFlag}` : ''

  return {
    name,

    formatExec(command) {
      return spec.exec(command)
    },

    async exec(command, options = {}) {
      const fullCommand = spec.exec(command)
      if (!options.allowFailure) {
        await execCommand(fullCommand)
        return
      }

      try {
        await execCommand(fullCommand)
      }
      catch {
        // 调用方已声明不关心成败，吞掉错误让流程继续
      }
    },

    async ensureInstalled(pkgs, options = {}) {
      const missing = pkgs.filter(pkg => !isInstalled(pkg))
      if (missing.length === 0)
        return

      const devFlag = options.dev ? ` ${spec.devFlag}` : ''
      await execCommand(`${name} ${spec.add}${rootFlag} ${missing.join(' ')}${devFlag}`)
    },

    async uninstall(pkg) {
      const s = yoctoSpinner({ text: 'uninstall running' }).start()
      try {
        await execCommand(`${name} ${spec.remove}${rootFlag} ${pkg}`)
        s.success(`succeed to uninstall ${pkg}!`)
      }
      catch (e) {
        // 先停掉 spinner 再抛，否则错误信息会和转动中的 spinner 抢同一行
        s.stop()
        throw new ScriptError(`Failed to uninstall ${pkg}.`, { cause: e })
      }
    },
  }
}
