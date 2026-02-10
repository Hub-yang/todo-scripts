import antfu from '@antfu/eslint-config'

export default antfu({
  vue: false,
  typescript: true,
  rules: {
    'no-console': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
  ignores: [
    '**/node_modules/**',
    'template-*',
    '**/dist/**',
  ],
})
