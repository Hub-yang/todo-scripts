import pico from 'picocolors'
import terminalLink from 'terminal-link'
import { getPkgInfo } from './info'

export function consoleInfo() {
  let { version = '--', author = 'HuberyYang', name = '@huberyyang/todo-scripts', homepage = 'https://github.com/Hub-yang/todo-scripts' } = getPkgInfo()
  version = pico.blue(`version ${version}`)
  name = pico.bold(pico.italic(name))
  author = pico.blue(`author ${author}`)
  homepage = pico.dim(`(${homepage})`)

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
}
