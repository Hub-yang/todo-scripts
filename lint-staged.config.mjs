export default {
  '*': [
    () => 'pnpm typecheck',
    () => 'pnpm lint:fix',
    () => 'pnpm test',
  ],
}
