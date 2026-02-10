import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/scripts/**.ts'],
  target: 'node20',
  outDir: 'dist',
  minify: true,
  tsconfig: 'tsconfig.json',
  fixedExtension: false,
  inlineOnly: false,
})
