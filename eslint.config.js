import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/assets'] },
  ...tseslint.configs.recommended,
  // Vue 必须在 tseslint 之后:让 vue-eslint-parser 对 .vue 文件生效
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      // 从宽起步:存量代码大量 var/any/未用变量,先关掉,后续按模块收紧
      'no-var': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'prefer-const': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/require-v-for-key': 'warn',
    },
  },
)
