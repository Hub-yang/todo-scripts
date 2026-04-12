import fs from 'node:fs'
import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getExecCommand,
  getInstallCommand,
  getPackageJSON,
  getPkgManager,
  getRunCommand,
  getUninstallCommand,
  isMonorepo,
  isRootFileExist,
  isTsProject,
  printErr,
  printWarn,
} from '@/utils'

// ========================================
// getPkgManager - 检测当前使用的包管理器
// ========================================
describe('getPkgManager', () => {
  // 每个测试运行后，恢复环境变量到原始状态，避免测试之间互相干扰
  const originalUserAgent = process.env.npm_config_user_agent

  afterEach(() => {
    if (originalUserAgent === undefined) {
      delete process.env.npm_config_user_agent
    }
    else {
      process.env.npm_config_user_agent = originalUserAgent
    }
  })

  it('应该正确解析 pnpm 的 user agent', () => {
    // 模拟 pnpm 环境下的 user agent 字符串
    process.env.npm_config_user_agent = 'pnpm/10.33.0 npm/? node/v22.12.0'
    const result = getPkgManager()
    expect(result).toEqual({ name: 'pnpm', version: '10.33.0' })
  })

  it('应该正确解析 npm 的 user agent', () => {
    process.env.npm_config_user_agent = 'npm/10.2.0 node/v20.10.0'
    const result = getPkgManager()
    expect(result).toEqual({ name: 'npm', version: '10.2.0' })
  })

  it('应该正确解析 yarn 的 user agent', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v20.10.0'
    const result = getPkgManager()
    expect(result).toEqual({ name: 'yarn', version: '1.22.19' })
  })

  it('应该正确解析 bun 的 user agent', () => {
    process.env.npm_config_user_agent = 'bun/1.0.0 npm/? node/v20.10.0'
    const result = getPkgManager()
    expect(result).toEqual({ name: 'bun', version: '1.0.0' })
  })

  it('当 user agent 不存在时应该返回 undefined', () => {
    // 删除环境变量，模拟非包管理器环境直接执行的情况
    delete process.env.npm_config_user_agent
    const result = getPkgManager()
    expect(result).toBeUndefined()
  })
})

// ========================================
// getInstallCommand - 获取安装命令
// ========================================
describe('getInstallCommand', () => {
  const originalUserAgent = process.env.npm_config_user_agent

  afterEach(() => {
    if (originalUserAgent === undefined) {
      delete process.env.npm_config_user_agent
    }
    else {
      process.env.npm_config_user_agent = originalUserAgent
    }
    // 恢复所有被 vi.spyOn 修改的函数
    vi.restoreAllMocks()
  })

  it('npm 环境下应该返回 "npm install"', () => {
    process.env.npm_config_user_agent = 'npm/10.2.0 node/v20.10.0'
    // 模拟非 monorepo 环境
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(getInstallCommand()).toBe('npm install')
  })

  it('pnpm 环境下应该返回 "pnpm install"', () => {
    process.env.npm_config_user_agent = 'pnpm/10.33.0 npm/? node/v22.12.0'
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(getInstallCommand()).toBe('pnpm install')
  })

  it('pnpm monorepo 环境下应该返回 "pnpm add -w"', () => {
    process.env.npm_config_user_agent = 'pnpm/10.33.0 npm/? node/v22.12.0'
    // 模拟 pnpm-workspace.yaml 文件存在
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    expect(getInstallCommand()).toBe('pnpm add -w')
  })

  it('yarn monorepo 环境下应该返回 "yarn add -W"', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v20.10.0'
    // 模拟 pnpm-workspace.yaml 不存在，但 package.json 有 workspaces 字段
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return !String(p).includes('pnpm-workspace.yaml')
    })
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ workspaces: ['packages/*'] }))
    expect(getInstallCommand()).toBe('yarn add -W')
  })

  it('没有 user agent 时应该回退到 "npm install"', () => {
    delete process.env.npm_config_user_agent
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(getInstallCommand()).toBe('npm install')
  })
})

// ========================================
// getUninstallCommand - 获取卸载命令
// ========================================
describe('getUninstallCommand', () => {
  const originalUserAgent = process.env.npm_config_user_agent

  afterEach(() => {
    if (originalUserAgent === undefined) {
      delete process.env.npm_config_user_agent
    }
    else {
      process.env.npm_config_user_agent = originalUserAgent
    }
    vi.restoreAllMocks()
  })

  it('npm 环境下应该返回 "npm uninstall"', () => {
    process.env.npm_config_user_agent = 'npm/10.2.0 node/v20.10.0'
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(getUninstallCommand()).toBe('npm uninstall')
  })

  it('pnpm 环境下应该返回 "pnpm remove"', () => {
    process.env.npm_config_user_agent = 'pnpm/10.33.0 npm/? node/v22.12.0'
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(getUninstallCommand()).toBe('pnpm remove')
  })

  it('pnpm monorepo 环境下应该返回 "pnpm remove -w"', () => {
    process.env.npm_config_user_agent = 'pnpm/10.33.0 npm/? node/v22.12.0'
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    expect(getUninstallCommand()).toBe('pnpm remove -w')
  })

  it('yarn monorepo 环境下应该返回 "yarn remove -W"', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v20.10.0'
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return !String(p).includes('pnpm-workspace.yaml')
    })
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ workspaces: ['packages/*'] }))
    expect(getUninstallCommand()).toBe('yarn remove -W')
  })
})

// ========================================
// getRunCommand - 获取运行脚本命令
// ========================================
describe('getRunCommand', () => {
  const originalUserAgent = process.env.npm_config_user_agent

  afterEach(() => {
    if (originalUserAgent === undefined) {
      delete process.env.npm_config_user_agent
    }
    else {
      process.env.npm_config_user_agent = originalUserAgent
    }
  })

  it('npm 环境下应该返回 "npm run"', () => {
    process.env.npm_config_user_agent = 'npm/10.2.0 node/v20.10.0'
    expect(getRunCommand()).toBe('npm run')
  })

  it('pnpm 环境下应该返回 "pnpm run"', () => {
    process.env.npm_config_user_agent = 'pnpm/10.33.0 npm/? node/v22.12.0'
    expect(getRunCommand()).toBe('pnpm run')
  })
})

// ========================================
// getExecCommand - 获取执行命令
// ========================================
describe('getExecCommand', () => {
  const originalUserAgent = process.env.npm_config_user_agent

  afterEach(() => {
    if (originalUserAgent === undefined) {
      delete process.env.npm_config_user_agent
    }
    else {
      process.env.npm_config_user_agent = originalUserAgent
    }
  })

  it('npm 环境下应该返回 "npx "', () => {
    process.env.npm_config_user_agent = 'npm/10.2.0 node/v20.10.0'
    expect(getExecCommand()).toBe('npx ')
  })

  it('pnpm 环境下应该返回 "pnpm exec "', () => {
    process.env.npm_config_user_agent = 'pnpm/10.33.0 npm/? node/v22.12.0'
    expect(getExecCommand()).toBe('pnpm exec ')
  })

  it('yarn 环境下应该返回 "yarn "', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v20.10.0'
    expect(getExecCommand()).toBe('yarn ')
  })

  it('bun 环境下应该返回 "bunx "', () => {
    process.env.npm_config_user_agent = 'bun/1.0.0 npm/? node/v20.10.0'
    expect(getExecCommand()).toBe('bunx ')
  })

  it('deno 环境下应该返回 "deno run -A npm:"', () => {
    process.env.npm_config_user_agent = 'deno/1.40.0 npm/? node/v20.10.0'
    expect(getExecCommand()).toBe('deno run -A npm:')
  })

  it('未知包管理器应该回退到 "npx"', () => {
    delete process.env.npm_config_user_agent
    expect(getExecCommand()).toBe('npx ')
  })
})

// ========================================
// isRootFileExist - 检查项目根目录文件是否存在
// ========================================
describe('isRootFileExist', () => {
  it('文件存在时应该返回 true', () => {
    // package.json 在当前项目根目录中一定存在
    expect(isRootFileExist('package.json')).toBe(true)
  })

  it('文件不存在时应该返回 false', () => {
    // 一个不可能存在的文件名
    expect(isRootFileExist('this-file-does-not-exist-12345.json')).toBe(false)
  })
})

// ========================================
// isTsProject - 检测是否为 TypeScript 项目
// ========================================
describe('isTsProject', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('存在 tsconfig.json 时应该返回 true', () => {
    // 模拟目录中包含 tsconfig.json
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['package.json', 'tsconfig.json', 'src'] as any)
    expect(isTsProject()).toBe(true)
  })

  it('存在 tsconfig.app.json 时应该返回 true', () => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['package.json', 'tsconfig.app.json'] as any)
    expect(isTsProject()).toBe(true)
  })

  it('存在 tsconfig.node.json 时应该返回 true', () => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['package.json', 'tsconfig.node.json'] as any)
    expect(isTsProject()).toBe(true)
  })

  it('存在 tsconfig.base.json 时应该返回 true', () => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['package.json', 'tsconfig.base.json'] as any)
    expect(isTsProject()).toBe(true)
  })

  it('存在 tsconfig.build.json 时应该返回 true', () => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['package.json', 'tsconfig.build.json'] as any)
    expect(isTsProject()).toBe(true)
  })

  it('不存在任何 tsconfig 文件时应该返回 false', () => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['package.json', 'index.js'] as any)
    expect(isTsProject()).toBe(false)
  })

  it('不应该误判名称相似但不匹配的文件', () => {
    // "mytsconfig.json" 不以 tsconfig 开头，不应匹配
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['mytsconfig.json', 'tsconfig-invalid'] as any)
    expect(isTsProject()).toBe(false)
  })
})

// ========================================
// isMonorepo - 检测是否为 monorepo 项目
// ========================================
describe('isMonorepo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('存在 pnpm-workspace.yaml 时应该返回 true', () => {
    // 模拟 pnpm-workspace.yaml 文件存在
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    expect(isMonorepo()).toBe(true)
  })

  it('package.json 中有 workspaces 字段时应该返回 true', () => {
    // 模拟 pnpm-workspace.yaml 不存在
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      // pnpm-workspace.yaml 不存在，但 package.json 存在
      return !String(p).includes('pnpm-workspace.yaml')
    })
    // 模拟 package.json 包含 workspaces 字段
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      name: 'my-monorepo',
      workspaces: ['packages/*'],
    }))
    expect(isMonorepo()).toBe(true)
  })

  it('既没有 pnpm-workspace.yaml 也没有 workspaces 时应该返回 false', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      return !String(p).includes('pnpm-workspace.yaml')
    })
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      name: 'my-project',
    }))
    expect(isMonorepo()).toBe(false)
  })
})

// ========================================
// getPackageJSON - 读取并解析 package.json
// ========================================
describe('getPackageJSON', () => {
  it('应该返回一个包含 name 字段的对象', () => {
    // 当前项目根目录有 package.json，直接读取真实文件
    const pkg = getPackageJSON()
    expect(pkg).toBeDefined()
    expect(pkg.name).toBe('@huberyyang/todo-scripts')
  })

  it('返回的对象应该包含 version 字段', () => {
    const pkg = getPackageJSON()
    // version 应该是一个语义化版本格式的字符串
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('当 package.json 不存在时应该返回 undefined', () => {
    // 模拟文件不存在的场景
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    const result = getPackageJSON()
    expect(result).toBeUndefined()
    vi.restoreAllMocks()
  })
})

// ========================================
// printWarn / printErr - 终端信息输出
// ========================================
describe('printWarn', () => {
  it('应该调用 console.log 输出警告信息', () => {
    // 使用 vi.spyOn 监听 console.log 的调用
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printWarn('test warning')
    // printWarn 会调用 3 次 console.log：空行、内容、空行
    expect(spy).toHaveBeenCalledTimes(3)
    // 第二次调用应该包含警告文本
    const output = spy.mock.calls[1][0] as string
    expect(output).toContain('test warning')
    expect(output).toContain('WARN')
    spy.mockRestore()
  })
})

describe('printErr', () => {
  it('应该调用 console.log 输出错误信息', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printErr('test error')
    expect(spy).toHaveBeenCalledTimes(3)
    const output = spy.mock.calls[1][0] as string
    expect(output).toContain('test error')
    expect(output).toContain('ERROR')
    spy.mockRestore()
  })
})
