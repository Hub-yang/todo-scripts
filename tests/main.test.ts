import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const initMock = vi.fn()
vi.mock('@/scripts/commitlint-init', () => ({ init: initMock }))

const printWarnMock = vi.fn()
const uninstallPkgMock = vi.fn()
const bannerMock = vi.fn()
vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils')>()
  return {
    ...actual,
    banner: bannerMock,
    printWarn: printWarnMock,
    uninstallPkg: uninstallPkgMock,
  }
})

vi.mock('yocto-spinner', () => ({
  default: () => ({ success: vi.fn(), start: vi.fn(), stop: vi.fn() }),
}))

const { main } = await import('@/scripts/main')

describe('main', () => {
  const originalArgv = process.argv

  beforeEach(() => {
    initMock.mockReset()
    printWarnMock.mockReset()
    uninstallPkgMock.mockReset()
    bannerMock.mockReset()
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.restoreAllMocks()
  })

  it('--help 时应该打印帮助信息，且不执行任何脚本', async () => {
    // --help 需要跟在脚本名之后，因为参数是从 argv[3] 开始解析的（argv[2] 是脚本名占位）
    process.argv = ['node', 'hubery', 'commitlint-init', '--help']
    await main()
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('commitlint-init'))
    expect(initMock).not.toHaveBeenCalled()
  })

  it('传入已注册脚本名时应该调用该脚本的 init', async () => {
    process.argv = ['node', 'hubery', 'commitlint-init']
    await main()
    expect(initMock).toHaveBeenCalledTimes(1)
    expect(process.exit).not.toHaveBeenCalled()
  })

  it('传入未注册脚本名时应该打印警告并以退出码 1 退出', async () => {
    process.argv = ['node', 'hubery', 'not-a-script']
    await main()
    expect(printWarnMock).toHaveBeenCalledWith('Please use a script.')
    expect(process.exit).toHaveBeenCalledWith(1)
    expect(initMock).not.toHaveBeenCalled()
  })

  it('不传脚本名时应该打印警告并以退出码 1 退出', async () => {
    process.argv = ['node', 'hubery']
    await main()
    expect(printWarnMock).toHaveBeenCalledWith('Please use a script.')
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('--clear 时应该在脚本执行完后卸载模块', async () => {
    process.argv = ['node', 'hubery', 'commitlint-init', '--clear']
    await main()
    expect(initMock).toHaveBeenCalledTimes(1)
    expect(uninstallPkgMock).toHaveBeenCalledWith('@huberyyang/todo-scripts')
    expect(process.exit).toHaveBeenCalled()
  })

  it('没有 --clear 时不应该卸载模块', async () => {
    process.argv = ['node', 'hubery', 'commitlint-init']
    await main()
    expect(uninstallPkgMock).not.toHaveBeenCalled()
  })

  it('每次调用都应该打印 banner', async () => {
    process.argv = ['node', 'hubery', 'commitlint-init', '--help']
    await main()
    expect(bannerMock).toHaveBeenCalledTimes(1)
  })
})
