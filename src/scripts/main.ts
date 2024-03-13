// match scripts
import process from 'node:process'

const sciptsMap = [
  'commitlint-init',
]

;(async () => {
  const a = process.argv[2]
  if (a && sciptsMap.includes(a)) {
    await import(`./${a}.mjs`)
  }
  else {
    console.warn('\nPlease use a script')
    process.exit(1)
  }
  // 通过--clear判断是否需要卸载
})()
