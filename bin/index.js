#!/usr/bin/env node

'use strict'
import process from 'node:process'
import { main, printErr, ScriptError } from '../dist/main.js'

main().catch((e) => {
  // 预期内的失败只给一行提示；其余的是 bug，原样抛出让 node 打完整堆栈
  if (!(e instanceof ScriptError))
    throw e
  printErr(e.message)
  process.exit(1)
})
