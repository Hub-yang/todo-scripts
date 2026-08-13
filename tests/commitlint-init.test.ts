import type { PackageJsonLike } from '@/utils'
import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(() => ''),
}))

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(async () => {}),
}))

const ensureInstalledMock = vi.fn(async (_pkgs: string[], _options?: { dev?: boolean }) => {})
const hasDependencyMock = vi.fn((_pkg: string) => false)
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
  hasDependency: hasDependencyMock,
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
    vi.resetAllMocks()
    pkgState = { name: 'demo' }
    // resetAllMocks 会清掉 implementation，这里重设各 mock 的默认行为
    getPackageJSONMock.mockImplementation(() => pkgState)
    ensureInstalledMock.mockResolvedValue(undefined)
    pmExecMock.mockResolvedValue(undefined)
    writePackageJSONMock.mockResolvedValue(undefined)
    isTsProjectMock.mockReturnValue(true)
    hasDependencyMock.mockReturnValue(false)
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

  it('husky hooks 已存在时应该保留用户原内容并给出警告', async () => {
    // husky 9 的 init 会无条件覆写 .husky/pre-commit，所以这里不能「什么都不做」，
    // 必须把 init 之前读到的原内容写回去，否则用户的钩子会被销毁
    vi.mocked(existsSync).mockImplementation(p => String(p).includes('.husky'))
    vi.mocked(readFileSync).mockReturnValue('# 用户自己手写的钩子')
    await init({})
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('.husky/pre-commit'), '# 用户自己手写的钩子')
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('.husky/commit-msg'), '# 用户自己手写的钩子')
    // 不能写成我们自己的钩子内容
    expect(writeFile).not.toHaveBeenCalledWith(expect.stringContaining('.husky/pre-commit'), expect.stringContaining('lint-staged'))
    expect(printWarnMock).toHaveBeenCalledWith(expect.stringContaining('.husky/pre-commit'))
    expect(printWarnMock).toHaveBeenCalledWith(expect.stringContaining('.husky/commit-msg'))
  })

  it('husky hooks 不存在时应该写入 pre-commit 和 commit-msg', async () => {
    await init({})
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('.husky/pre-commit'), expect.stringContaining('lint-staged'))
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('.husky/commit-msg'), expect.stringContaining('commitlint'))
  })

  it('husky init 自己创建的 pre-commit 不应该挡住我们的钩子', async () => {
    // 回归用例：husky init 会生成一个内容为 `npm test` 的 .husky/pre-commit。
    // 存在性判断必须发生在 husky init 之前，否则我们的钩子永远写不进去。
    let huskyInitialized = false
    pmExecMock.mockImplementation(async (command: string) => {
      if (command === 'husky init')
        huskyInitialized = true
    })
    vi.mocked(existsSync).mockImplementation(p => huskyInitialized && String(p).includes('.husky/pre-commit'))

    await init({})

    expect(huskyInitialized).toBe(true)
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.husky/pre-commit'),
      expect.stringContaining('lint-staged'),
    )
    // 这个钩子本来就不属于用户，不该冒出「已存在」的提示
    expect(printWarnMock).not.toHaveBeenCalledWith(expect.stringContaining('.husky/pre-commit'))
  })

  it('应该在 package.json 中写入 commitlint 脚本和 lint-staged 配置', async () => {
    await init({})
    expect(writePackageJSONMock).toHaveBeenCalled()
    const written = writePackageJSONMock.mock.calls[0][0]
    expect(written.scripts!.commitlint).toBe('commitlint --edit')
    expect(written['lint-staged']).toEqual({ '*': 'eslint --fix' })
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
    hasDependencyMock.mockImplementation(pkg => pkg === 'eslint')
    await init({})
    expect(pmExecMock).toHaveBeenCalledWith(
      'eslint package.json commitlint.config.ts --fix',
      { allowFailure: true },
    )
  })

  it('不应该再往 package.json 里写临时的 fix 脚本', async () => {
    hasDependencyMock.mockImplementation(pkg => pkg === 'eslint')
    await init({})
    // package.json 只在写配置那一步被写入一次，lint 不再产生额外往返
    expect(writePackageJSONMock).toHaveBeenCalledTimes(1)
    for (const [written] of writePackageJSONMock.mock.calls)
      expect(written.scripts!['__hubery__:fix']).toBeUndefined()
  })

  it('未检测到 eslint 时不应该运行 lint', async () => {
    hasDependencyMock.mockReturnValue(false)
    await init({})
    expect(pmExecMock).not.toHaveBeenCalledWith(
      expect.stringContaining('eslint'),
      expect.anything(),
    )
  })
})
