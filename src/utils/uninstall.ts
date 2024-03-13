import process from 'node:process'
import { execaCommand } from 'execa'

import ora from 'ora'

export async function uninstallPackages(pkg: string) {
  try {
    const command = `pnpm uninstall ${pkg}`
    await execaCommand(command)
    ora().succeed(`succeed to uninstall ${pkg}!`)
  }
  catch (error) {
    console.warn(`\nFail to uninstall ${pkg}`)
    process.exit(1)
  }
}
