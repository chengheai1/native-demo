// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Reanimated shared values are intentionally mutable worklet state.
      'react-hooks/immutability': 'off',
      // Bottom sheets synchronize visibility with a native modal.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
