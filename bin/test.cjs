#!/usr/bin/env node

// add-test-script.js
const fs = require('node:fs')

const p = require('node:process')

// 读取 package.json 文件
const packageJson = JSON.parse(fs.readFileSync('package.json'))

// 添加 test 脚本
packageJson.scripts = {
  ...packageJson.scripts,
  hubery: 'hubery',
}

// 将修改后的 package.json 文件写回到磁盘
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
p.stdout.write('测试脚本执行完毕')
