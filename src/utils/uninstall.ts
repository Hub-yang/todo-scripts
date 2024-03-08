import process from 'node:process'
import { execaCommand } from 'execa'

export async function uninstallPackages(pkg: string) {
  try {
    const command = `pnpm uninstall ${pkg}`
    await execaCommand(command)
  }
  catch (error) {
    console.warn('\nFail to uninstall packages')
    process.exit(1)
  }
}
