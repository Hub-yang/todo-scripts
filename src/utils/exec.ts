import process from 'node:process'
import { execaCommand } from 'execa'
import { Print } from './print'

export async function execCommand(command: string) {
  try {
    await execaCommand(command)
  }
  catch (error) {
    Print.getInstance().err(`Failed to execute '${command}'.`)
    process.exit(1)
  }
}
