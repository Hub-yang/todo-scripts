import process from 'node:process'
import type { ModuleDesc } from './check'

export async function importPackage(packageName: string): Promise<ModuleDesc> {
  try {
    const module = await import(packageName)
    return {
      module: module?.default || module?.[packageName],
    }
  }
  catch (e) {
    console.warn(`\nFailed to import ${packageName}`)
    process.exit(1)
  }
}
