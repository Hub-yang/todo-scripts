<h3 align=center>一些帮助简化前端配置工程的通用脚本</h3>

## 现在开始

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

## > `commitlint config`

自动执行 [commitlint](https://github.com/conventional-changelog/commitlint) + [husky](https://github.com/typicode/husky) + [lint-staged](https://github.com/lint-staged/lint-staged)安装与配置

```shell [npm]
npx hubery commitlint-init
```

```shell [pnpm]
pnpm exec hubery commitlint-init
```

```shell [bun]
bunx hubery commitlint-init
```

## 尝试执行

如果没什么意外（顺利执行且终端没有报错）恭喜你配置完成🎉. 来测试下:

```shell
git commit -m "test commitlint"
# eslint 会在每次执行commit前自动执行

```
