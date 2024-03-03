#!/usr/bin/env node

const fs = require('node:fs')
const p = require('node:process')

// 读取 package.json 文件
const packageJson = JSON.parse(fs.readFileSync('package.json'))

// 添加 test 脚本
packageJson.scripts = {
  ...packageJson.scripts,
  hubery: 'hubery',
}

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
p.stdout.write('测试脚本执行完毕')
