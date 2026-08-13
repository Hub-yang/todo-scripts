import type { PackageJsonLike } from '@/utils'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(async () => {}),
}))

const ensureInstalledMock = vi.fn(async (_pkgs: string[], _options?: { dev?: boolean }) => {})
const isInstalledMock = vi.fn((_pkg: string) => false)
const execCommandMock = vi.fn(async () => {})
const pmExecMock = vi.fn(async (_command: string, _options?: { allowFailure?: boolean }) => {})
const isTsProjectMock = vi.fn(() => true)
const printWarnMock = vi.fn()
const writePackageJSONMock = vi.fn(async (_data: PackageJsonLike) => {})
let pkgState: PackageJsonLike
const getPackageJSONMock = vi.fn((): PackageJsonLike => pkgState)

vi.mock('@/utils', () => ({
  execCommand: execCommandMock,
  getPackageJSON: getPackageJSONMock,
  isInstalled: isInstalledMock,
  isTsProject: isTsProjectMock,
  printWarn: printWarnMock,
  writePackageJSON: writePackageJSONMock,
}))

// 唯一一个包管理器 seam：脚本只通过它跟 npm/pnpm/yarn 打交道
vi.mock('@/utils/package-manager', () => ({
  createPackageManager: () => ({
    name: 'pnpm',
    ensureInstalled: ensureInstalledMock,
    exec: pmExecMock,
    formatExec: (command: string) => `pnpm exec ${command}`,
    uninstall: vi.fn(),
  }),
}))

vi.mock('yocto-spinner', () => ({
  default: () => ({ start: vi.fn(), success: vi.fn(), stop: vi.fn() }),
}))

const { init } = await import('@/scripts/commitlint-init')

describe('commitlint-init init()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pkgState = { name: 'demo' }
    isTsProjectMock.mockReturnValue(true)
    isInstalledMock.mockReturnValue(false)
    vi.mocked(existsSync).mockReturnValue(false)
  })

  it('.git 不存在时应该执行 git init', async () => {
    await init({})
    expect(execCommandMock).toHaveBeenCalledWith('git init')
  })

  it('.git 已存在时不应该重复执行 git init', async () => {
    vi.mocked(existsSync).mockImplementation(p => String(p).endsWith('.git'))
    await init({})
    expect(execCommandMock).not.toHaveBeenCalledWith('git init')
  })

  it('默认（非 czgit）应该只安装 4 个基础依赖', async () => {
    await init({})
    // 一次调用装完，不再逐包串行
    expect(ensureInstalledMock).toHaveBeenCalledTimes(1)
    expect(ensureInstalledMock).toHaveBeenCalledWith(
      ['@commitlint/cli', '@commitlint/config-conventional', 'husky', 'lint-staged'],
      { dev: true },
    )
  })

  it('--czgit 时应该额外安装 commitizen 和 cz-git', async () => {
    await init({ czgit: true })
    const [pkgs] = ensureInstalledMock.mock.calls[0]
    expect(pkgs).toContain('commitizen')
    expect(pkgs).toContain('cz-git')
  })

  it('是 TS 项目时应该写 commitlint.config.ts', async () => {
    isTsProjectMock.mockReturnValue(true)
    await init({})
    expect(writeFile).toHaveBeenCalledWith('commitlint.config.ts', expect.any(String))
  })

  it('非 TS 项目应该写 commitlint.config.js', async () => {
    isTsProjectMock.mockReturnValue(false)
    await init({})
    expect(writeFile).toHaveBeenCalledWith('commitlint.config.js', expect.any(String))
  })

  it('commitlint 配置文件已存在时应该跳过写入并给出警告', async () => {
    vi.mocked(existsSync).mockImplementation(p => String(p).includes('commitlint.config'))
    await init({})
    expect(writeFile).not.toHaveBeenCalledWith(expect.stringContaining('commitlint.config'), expect.anything())
    expect(printWarnMock).toHaveBeenCalledWith(expect.stringContaining('already exists'))
  })

  it('husky hooks 已存在时应该跳过写入并给出警告', async () => {
    vi.mocked(existsSync).mockImplementation(p => String(p).includes('.husky'))
    await init({})
    expect(writeFile).not.toHaveBeenCalledWith(expect.stringContaining('.husky/pre-commit'), expect.anything())
    expect(writeFile).not.toHaveBeenCalledWith(expect.stringContaining('.husky/commit-msg'), expect.anything())
    expect(printWarnMock).toHaveBeenCalledWith(expect.stringContaining('.husky/pre-commit'))
    expect(printWarnMock).toHaveBeenCalledWith(expect.stringContaining('.husky/commit-msg'))
  })

  it('husky hooks 不存在时应该写入 pre-commit 和 commit-msg', async () => {
    await init({})
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('.husky/pre-commit'), expect.stringContaining('lint-staged'))
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('.husky/commit-msg'), expect.stringContaining('commitlint'))
  })

  it('应该在 package.json 中写入 commitlint 脚本和 lint-staged 配置', async () => {
    await init({})
    expect(writePackageJSONMock).toHaveBeenCalled()
    const written = writePackageJSONMock.mock.calls[0][0]
    expect(written.scripts!.commitlint).toBe('commitlint --edit')
    expect(written['lint-staged']).toEqual({ '*': 'eslint . --fix' })
  })

  it('--czgit 时应该写入 commitizen 配置和 cz 脚本', async () => {
    await init({ czgit: true })
    const written = writePackageJSONMock.mock.calls[0][0]
    expect(written.config!.commitizen).toEqual({ path: 'node_modules/cz-git' })
    expect(written.scripts!.cz).toBe('git cz')
  })

  it('非 czgit 时应该清理已有的 commitizen 配置和 cz 脚本', async () => {
    pkgState = {
      name: 'demo',
      scripts: { cz: 'git cz' },
      config: { commitizen: { path: 'node_modules/cz-git' } },
    }
    await init({})
    const written = writePackageJSONMock.mock.calls[0][0]
    expect(written.config!.commitizen).toBeUndefined()
    expect(written.scripts!.cz).toBeUndefined()
  })

  it('检测到 eslint 时应该直接执行本地 eslint，且允许失败', async () => {
    isInstalledMock.mockImplementation(pkg => pkg === 'eslint')
    await init({})
    expect(pmExecMock).toHaveBeenCalledWith(
      'eslint package.json commitlint.config.ts --fix',
      { allowFailure: true },
    )
  })

  it('不应该再往 package.json 里写临时的 fix 脚本', async () => {
    isInstalledMock.mockImplementation(pkg => pkg === 'eslint')
    await init({})
    // package.json 只在写配置那一步被写入一次，lint 不再产生额外往返
    expect(writePackageJSONMock).toHaveBeenCalledTimes(1)
    for (const [written] of writePackageJSONMock.mock.calls)
      expect(written.scripts!['__hubery__:fix']).toBeUndefined()
  })

  it('未检测到 eslint 时不应该运行 lint', async () => {
    isInstalledMock.mockReturnValue(false)
    await init({})
    expect(pmExecMock).not.toHaveBeenCalledWith(
      expect.stringContaining('eslint'),
      expect.anything(),
    )
  })
})
