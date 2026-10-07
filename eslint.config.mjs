import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', '.content-collections/**', 'node_modules/**', 'docs/**', 'next-env.d.ts'] },
]

export default config
