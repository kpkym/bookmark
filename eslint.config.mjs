import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  ignores: [
    '.claude/**',
    '.next/**',
    'extension/**',
    'docs/**',
  ],
  rules: {
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
  },
})
