import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    {
      input: './src/scripts/index',
      name: 'index',
      outDir: './dist',
    },
    {
      input: './src/scripts/main',
      name: 'main',
      outDir: './dist',
    },
    {
      input: './src/scripts/commitlint-init',
      name: 'commitlint-init',
      outDir: './dist',
    },
  ],
  // Generates .d.ts declaration file
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
})
