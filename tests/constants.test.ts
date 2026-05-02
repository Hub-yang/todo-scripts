import { describe, expect, it } from 'vitest'
import {
  CONFIG_COMMITLINT,
  CONFIG_COMMITLINT_CZGIT,
  DEFAULT_PKG_NAME,
  HELP_MESSAGE,
  REPO_URL,
  WRITE_COMMIT_MSG,
  WRITE_COMMIT_PRE,
} from '@/constants'

// DEFAULT_PKG_NAME / REPO_URL - 基础常量
describe('基础常量', () => {
  it('default_PKG_NAME 应该是正确的包名', () => {
    expect(DEFAULT_PKG_NAME).toBe('@huberyyang/todo-scripts')
  })

  it('repo_URL 应该是有效的 GitHub 仓库地址', () => {
    expect(REPO_URL).toContain('github.com')
    expect(REPO_URL).toContain('todo-scripts')
  })
})

// HELP_MESSAGE - 帮助信息
describe('help_MESSAGE', () => {
  it('应该包含可用指令 commitlint-init', () => {
    expect(HELP_MESSAGE).toContain('commitlint-init')
  })

  it('应该包含所有参数说明', () => {
    // 检查所有支持的命令行参数是否都在帮助信息中
    expect(HELP_MESSAGE).toContain('--help')
    expect(HELP_MESSAGE).toContain('--clear')
    expect(HELP_MESSAGE).toContain('--czgit')
  })
})

// CONFIG_COMMITLINT - 标准 commitlint 配置模板
describe('config_COMMITLINT', () => {
  it('应该是有效的 JavaScript 导出语句', () => {
    // 配置模板应该以 export default 开头
    expect(CONFIG_COMMITLINT).toMatch(/^export default/)
  })

  it('应该继承 @commitlint/config-conventional', () => {
    expect(CONFIG_COMMITLINT).toContain('@commitlint/config-conventional')
  })

  it('应该包含必要的 commit 类型', () => {
    // 验证常用的 commit 类型是否都在配置中
    const requiredTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'revert']
    for (const type of requiredTypes) {
      expect(CONFIG_COMMITLINT).toContain(`'${type}'`)
    }
  })
})

// CONFIG_COMMITLINT_CZGIT - cz-git 增强配置模板
describe('config_COMMITLINT_CZGIT', () => {
  it('应该包含 cz-git 的类型声明注释', () => {
    expect(CONFIG_COMMITLINT_CZGIT).toContain('cz-git')
  })

  it('应该继承 @commitlint/config-conventional', () => {
    expect(CONFIG_COMMITLINT_CZGIT).toContain('@commitlint/config-conventional')
  })

  it('应该包含 prompt 交互配置', () => {
    // cz-git 的核心功能是交互式提交，需要 prompt 配置
    expect(CONFIG_COMMITLINT_CZGIT).toContain('prompt')
    expect(CONFIG_COMMITLINT_CZGIT).toContain('messages')
    expect(CONFIG_COMMITLINT_CZGIT).toContain('types')
  })

  it('应该包含中文提示信息', () => {
    // 项目面向中文用户，prompt 中应该有中文
    expect(CONFIG_COMMITLINT_CZGIT).toContain('选择你要提交的类型')
    expect(CONFIG_COMMITLINT_CZGIT).toContain('填写简短精炼的变更描述')
  })

  it('types 数组中每项应该同时包含中英文说明', () => {
    // 每个 type 都应该有 "中文 | English" 格式的 name
    expect(CONFIG_COMMITLINT_CZGIT).toContain('新增功能 | A new feature')
    expect(CONFIG_COMMITLINT_CZGIT).toContain('修复缺陷 | A bug fix')
  })
})

// WRITE_COMMIT_PRE / WRITE_COMMIT_MSG - husky 钩子模板
describe('husky 钩子模板', () => {
  it('write_COMMIT_PRE 应该包含 lint-staged 命令', () => {
    // pre-commit 钩子应该运行 lint-staged
    expect(WRITE_COMMIT_PRE).toContain('lint-staged')
  })

  it('write_COMMIT_MSG 应该包含 commitlint 命令', () => {
    // commit-msg 钩子应该运行 commitlint
    expect(WRITE_COMMIT_MSG).toContain('commitlint')
  })

  it('write_COMMIT_MSG 应该包含 --edit 参数', () => {
    // commitlint 需要 --edit 参数来读取提交信息
    expect(WRITE_COMMIT_MSG).toContain('--edit')
  })
})
