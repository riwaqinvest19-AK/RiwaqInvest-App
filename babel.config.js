module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Reanimated: must be last. Required for worklets; omitting it can break runtime.
    plugins: ['react-native-reanimated/plugin'],
  };
};
