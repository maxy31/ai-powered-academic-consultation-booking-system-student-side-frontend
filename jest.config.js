module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|@react-native-async-storage|@react-native-firebase|@react-native-picker|react-native-image-picker|react-native-picker-select|@stomp|sockjs-client)/)'
  ],
  testTimeout: 15000,
};
