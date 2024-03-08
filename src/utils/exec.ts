import process from 'node:process'
import { execaCommand } from 'execa'

export async function execCommand(command: string) {
  try {
    await execaCommand(command)
  }
  catch (error) {
    console.warn(`\nFail to execute '${command}'`)
    process.exit(1)
  }
}
