import process from 'node:process'
import type { ModuleDesc } from './check'
import { Print } from './print'

export async function importPackage(packageName: string): Promise<ModuleDesc> {
  try {
    const module = await import(packageName)
    return {
      module: module?.default || module?.[packageName],
    }
  }
  catch (_e) {
    Print.getInstance().err(`Failed to import ${packageName}.`)
    process.exit(1)
  }
}
