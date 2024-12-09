# @huberyyang/todo-scripts

<h2 align=center>🔥一些帮助简化前端配置工程的通用脚本</h2>

> [!IMPORTANT]
> ⚠️ 目前模块内使用pnpm，后期新增自动判断

#### 没有pnpm？，执行
```shell [npm]
npm install pnpm -g
```

## 开始

### 安装

```shell [npm]
npm install --save-dev @huberyyang/todo-scripts
```
```shell [pnpm]
pnpm add --save-dev @huberyyang/todo-scripts
```
```shell [yarn]
yarn add --dev @huberyyang/todo-scripts
```
```shell [bun]
bun add --dev @huberyyang/todo-scripts
```

<details>
<summary>
🔵 Commitlint config
</summary>

🚀自动执行 [commitlint](https://github.com/conventional-changelog/commitlint) + [husky](https://github.com/typicode/husky) + [lint-staged](https://github.com/lint-staged/lint-staged)安装与配置

### 执行

```shell [npm]
npx hubery commitlint-init
```

```shell [pnpm]
pnpm exec hubery commitlint-init
```

```shell [bun]
bunx hubery commitlint-init
```

### 配置项

> `--clear` 🧹清洁执行 - 执行完脚本后卸载模块

```shell [npm]
npx hubery commitlint-init --clear
```

> `--czgit` 📦配置[cz-git](https://github.com/Zhengqbbb/cz-git)支持

```shell [npm]
npx hubery commitlint-init --czgit
```

### 测试一下🎉
> [!NOTE]
> eslint 会在每次执行commit前自动执行，如需更改commit钩子执行前的命令，可自行修改**package.json**中**lint-staged**配置
>

```shell
git add .
git commit -m "test commitlint"
```

## License
