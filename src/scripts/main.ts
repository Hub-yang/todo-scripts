import process from 'node:process'
import chalk from 'chalk'
import terminalLink from 'terminal-link'
import { uninstallPackages } from '../utils/uninstall'
import { computeTimeConsuming } from '../utils/timeConsuming'
import { Print } from '../utils/print'
import { getPkgInfo } from '../utils/info'

// get pkg info
let { version = '--', author = 'HuberyYang', name = '@huberyyang/todo-scripts', homepage = 'https://github.com/Hub-yang/todo-scripts' } = getPkgInfo()
version = chalk.blue(`version ${version}`)
name = chalk.bold.italic(name)
author = chalk.blue(`author ${author}`)
homepage = chalk.dim(`(${homepage})`)

const link_version = terminalLink(version, 'https://www.npmjs.com/package/@huberyyang/todo-scripts')
const link_name = terminalLink(name, 'https://github.com/Hub-yang/todo-scripts')
const link_author = terminalLink(author, 'https://github.com/Hub-yang/todo-scripts')
const isSupported = terminalLink.isSupported

if (isSupported) {
  console.log(`
   ==================================
   ⦚       ${link_name} ⦚
   ⦚                                ⦚
   ⦚                  ${link_version} ⦚
   ⦚              ${link_author} ⦚
   ==================================`)
}
else {
  console.log(`
   ==============================================
   ⦚         ${name}           ⦚
   ⦚                                            ⦚
   ⦚                       ${version} ⦚
   ⦚                          ${author} ⦚
   ⦚ ${homepage} ⦚
   ==============================================`)
}

const scriptsMap = ['commitlint-init']

;(async () => {
  const a = process.argv[2]
  const o = process.argv[3]
  const print = Print.getInstance()

  if (a && scriptsMap.includes(a)) {
    const script = await import(`./${a}.mjs`)
    await computeTimeConsuming(script.main)
    // Check if uninstallation is required
    if (o === '--clear') {
      await uninstallPackages('@huberyyang/todo-scripts')
      process.exit()
    }
  }
  else {
    print.warn('Please use a script.')
    process.exit(1)
  }
})()
