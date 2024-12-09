import process from 'node:process'
import { execaCommand } from 'execa'
import ora from 'ora'
import { Print } from './print'

export async function uninstallPackages(pkg: string) {
  try {
    const spinner = ora()
    Print.getInstance().startWithDots({ prefixText: 'uninstall running', withOra: true, spinner })
    const command = `pnpm uninstall ${pkg}`
    await execaCommand(command)
    spinner.succeed(`succeed to uninstall ${pkg}!`)
  }
  catch (_error) {
    Print.getInstance().err(`Failed to uninstall ${pkg}.`)
    process.exit(1)
  }
}
