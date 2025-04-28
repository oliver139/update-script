import eslintConfig from '@oliver139/eslint-config'

export default eslintConfig({
  javascript: {
    overrides: {
      'antfu/no-top-level-await': 'off',
    },
  },
})
