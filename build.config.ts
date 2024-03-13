import { basename } from 'node:path'
import { defineBuildConfig } from 'unbuild'
import fg from 'fast-glob'

export default defineBuildConfig({
  entries: [
    ...fg.sync('src/scripts/*.ts').map(i => ({
      input: i.slice(0, -3),
      name: basename(i).slice(0, -3),
    })),
  ],
  // Generates .d.ts declaration file
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
})
