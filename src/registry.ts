import type { ArgvOptions } from '@/utils'
import { green } from 'picocolors'

export interface Script {
  /** 子命令名，用户在命令行里输入的就是它 */
  name: string
  /** 帮助信息里的一句话说明 */
  summary: string
  summaryEn: string
  /** 按需加载脚本实现 */
  load: () => Promise<{ init: (options: ArgvOptions) => Promise<void> }>
}

/**
 * 所有可用子命令的唯一清单
 *
 * 新增脚本只需要在这里加一项 —— 帮助信息由它渲染，
 * 命令派发也查它，不存在两份需要手工同步的列表
 */
export const SCRIPTS: Script[] = [
  {
    name: 'commitlint-init',
    summary: '一键生成 commitlint + husky + lint-staged 配置',
    summaryEn: 'Scaffold commitlint + husky + lint-staged config in one command',
    load: () => import('./scripts/commitlint-init'),
  },
]

export function findScript(name: string | undefined): Script | undefined {
  return SCRIPTS.find(script => script.name === name)
}

/**
 * 帮助信息
 *
 * 可用指令部分从 SCRIPTS 派生，不会和实际支持的命令脱节
 */
export function renderHelp(): string {
  const commands = SCRIPTS
    .map(({ name, summary, summaryEn }) => `  ${green(name)}\n      ${summary}\n      ${summaryEn}`)
    .join('\n')

  return `\
一些帮助简化前端配置工程的通用脚本
Utility scripts to simplify frontend project configuration

用法 / Usage: hubery <script> [参数/options]...

可用指令 / Available commands:
${commands}

参数 / Options:
  -h, --help                         查看帮助 / show help
  --clear                            清洁执行 - 执行完脚本后卸载模块 / uninstall the module after running
  --czgit                            配置 cz-git / enable cz-git
`
}
