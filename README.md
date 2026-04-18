<h1 align="center">🔥 todo-scripts</h1>

<div align="center">
  <a href="https://github.com/Hub-yang/todo-scripts"><img src="https://img.shields.io/github/package-json/v/Hub-yang/todo-scripts?style=flat-square&label=%20&color=%23000" alt="github version"></a>
  <a href="https://github.com/Hub-yang/todo-scripts"><img src="https://img.shields.io/static/v1?label=%F0%9F%8C%9F&message=If%20Useful&style=flat-square&color=BC4E99" alt="star badge"/></a>
  <a href="https://opensource.org/license/MIT"><img src="https://img.shields.io/npm/l/express?style=flat-square" alt="license"/></a>
</div>

### 💡 说明 (Features)

一些帮助简化前端配置工程的通用脚本

### 📦 安装 (Install)

```shell
# npm
npm install --save-dev @huberyyang/todo-scripts
# pnpm
pnpm add --save-dev @huberyyang/todo-scripts
# yarn
yarn add --dev @huberyyang/todo-scripts
# bun
bun add --dev @huberyyang/todo-scripts
```

如果你的项目是 **monorepo**，请使用以下命令安装到工作区根目录：

```shell
# pnpm
pnpm add -wD @huberyyang/todo-scripts
# yarn
yarn add -W --dev @huberyyang/todo-scripts
# npm
npm install --save-dev @huberyyang/todo-scripts
# bun
bun add --dev @huberyyang/todo-scripts
```

### 🔌 当前可用指令 (Current Script)

- `commitlint-init`

<details>
<summary>
🟢 commitlint-init
</summary>

🚀 一条命令搞定 [commitlint](https://github.com/conventional-changelog/commitlint) + [husky](https://github.com/typicode/husky) + [lint-staged](https://github.com/lint-staged/lint-staged) 配置，告别繁琐的手动配置

#### ⚡️ 执行

```shell
# npm
npx hubery commitlint-init
# pnpm
pnpm exec hubery commitlint-init
# yarn
yarn hubery commitlint-init
# bun
bunx hubery commitlint-init
```

#### ⚙️ 参数说明

- `-h, --help` 查看帮助
- `--clear` 清洁执行 - 执行完脚本后卸载模块
- `--czgit` 配置[cz-git](https://github.com/Zhengqbbb/cz-git)支持

#### 🎉 测试

> [!NOTE]
> eslint 会在每次执行commit前自动执行，如需更改commit钩子执行前的命令，可自行修改**package.json**中**lint-staged**配置

```shell
git add .
git commit -m "test commitlint"
```

### 📜 许可证 (License)

MIT License © 2026 [Hubery Yang](https://github.com/Hub-yang)
