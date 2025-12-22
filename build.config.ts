import { basename } from 'node:path'
import fg from 'fast-glob'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    ...fg.sync('src/scripts/*.ts').map(i => ({
      input: i.slice(0, -3),
      name: basename(i).slice(0, -3),
    })),
  ],
  // Generates .d.ts declaration files
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
})
