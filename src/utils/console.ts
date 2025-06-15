import pico from 'picocolors'
import terminalLink from 'terminal-link'
import { getPkgInfo } from './info'

export function consoleInfo() {
  let { version = '--', author = 'HuberyYang', name = '@huberyyang/todo-scripts', homepage = 'https://github.com/Hub-yang/todo-scripts' } = getPkgInfo()
  const l_version = version.length
  const l_author = author.length
  const l_name = name.length
  name = pico.bold(pico.italic(name))
  version = pico.blue(`version ${version}`)
  author = pico.blue(`author ${author}`)
  homepage = pico.dim(`(${homepage})`)

  const link_version = terminalLink(version, 'https://www.npmjs.com/package/@huberyyang/todo-scripts')
  const link_name = terminalLink(name, 'https://github.com/Hub-yang/todo-scripts')
  const link_author = terminalLink(author, 'https://github.com/Hub-yang/todo-scripts')
  const isSupportLink = terminalLink.isSupported

  const l_init = 36
  const lineBase = '='.repeat(l_init)
  const lineOne = `⦚${' '.repeat(l_init - 2 - l_name)}${isSupportLink ? link_name : name}⦚`
  const lineTwo = `⦚${' '.repeat(l_init - 2)}⦚`
  const lineThree = `⦚${' '.repeat(l_init - 2 - l_version - 'version'.length - 1)}${isSupportLink ? link_version : version}⦚`
  const lineFour = `⦚${' '.repeat(l_init - 2 - l_author - 'author'.length - 1)}${isSupportLink ? link_author : author}⦚`

  if (isSupportLink) {
    console.log(`
     ${lineBase}
     ${lineOne}
     ${lineTwo}
     ${lineThree}
     ${lineFour}
     ${lineBase}`)
  }
  else {
    console.log(`
     ${lineBase}
     ${lineOne}
     ${lineTwo}
     ${lineThree}
     ${lineFour}
     ${lineBase}
     ${homepage}`)
  }
}
