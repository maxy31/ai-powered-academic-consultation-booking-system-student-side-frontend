// Extend jest-native matchers (optional)
try { require('@testing-library/jest-native/extend-expect'); } catch {}
// RNGH setup for tests (optional)
try { require('react-native-gesture-handler/jestSetup'); } catch {}

// Silence Animated warnings (path may differ across RN versions)
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });
} catch {}

// Mock reanimated (virtual to avoid resolution when not installed)
jest.mock(
  'react-native-reanimated',
  () => ({
    default: {},
    Easing: {},
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    withRepeat: (v: any) => v,
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
  }),
  { virtual: true }
);

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
  {
    const mock = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
    // Ensure clear exists and getItem returns jwt after setItem during tests
    if (!mock.clear) mock.clear = jest.fn(async () => {});
    const origSetItem = mock.setItem;
    const store: Record<string, string> = {};
    mock.setItem = jest.fn(async (key: string, value: string) => { store[key] = value; return origSetItem(key, value); });
    const origGetItem = mock.getItem;
    mock.getItem = jest.fn(async (key: string) => {
      if (key in store) return store[key];
      return origGetItem(key);
    });
    return mock;
  }
);

// Vector icons mock
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Image picker mock (virtual - avoids ESM import from node_modules)
jest.mock(
  'react-native-image-picker',
  () => ({
    launchCamera: jest.fn((opts: any, cb: any) => cb && cb({ didCancel: true })),
    launchImageLibrary: jest.fn((opts: any, cb: any) => cb && cb({ didCancel: true })),
  }),
  { virtual: true }
);

// Picker select mock
jest.mock('react-native-picker-select', () => 'RNPickerSelect', { virtual: true });

// notifee mock
jest.mock('@notifee/react-native', () => ({
  requestPermission: jest.fn(async () => ({})),
  createChannel: jest.fn(async () => 'general'),
  displayNotification: jest.fn(async () => {}),
  AndroidImportance: { HIGH: 4 },
}));

// @react-native-firebase/messaging mock (virtual) to bypass native modules
jest.mock(
  '@react-native-firebase/messaging',
  () => {
    const messagingInstance = {
      onTokenRefresh: jest.fn(),
      onMessage: jest.fn(),
      setBackgroundMessageHandler: jest.fn(),
      getToken: jest.fn(async () => 'TEST_TOKEN'),
      isDeviceRegisteredForRemoteMessages: true,
      registerDeviceForRemoteMessages: jest.fn(async () => {}),
      requestPermission: jest.fn(async () => 1),
      hasPermission: jest.fn(async () => 1),
    };
    const messaging = () => messagingInstance;
    // attach useful props for code paths that read messaging().xxx at import time
    Object.assign(messaging, messagingInstance);
    return messaging;
  },
  { virtual: true }
);

// STOMP & SockJS mock (no-op client)
jest.mock('@stomp/stompjs', () => ({
  Client: function () {
    return {
      activate: jest.fn(),
      deactivate: jest.fn(),
      subscribe: jest.fn(),
    };
  },
}));
jest.mock('sockjs-client', () => function SockJS() { return {}; });

// react-native-screens: noop enableScreens
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return { ...actual, enableScreens: jest.fn() };
});

// Global fetch default: return empty 204 to avoid real network
// Individual tests can override as needed
if (!(global as any).fetch) {
  (global as any).fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 204, text: () => Promise.resolve('') })
  );
}

// Optional: quiet some noisy logs during tests
const origWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args?.[0] || '';
  if (typeof msg === 'string' && (
    msg.includes('Require cycle:') ||
    msg.includes('deprecated')
  )) return;
  origWarn(...args);
};

// Note: Avoid enabling fake timers globally to reduce conflicts with RN internals

// Track timers to avoid open handle leaks across tests
const _timerRegistry = {
  intervals: new Set<any>(),
  timeouts: new Set<any>(),
};

const _origSetInterval = global.setInterval;
const _origClearInterval = global.clearInterval;
const _origSetTimeout = global.setTimeout;
const _origClearTimeout = global.clearTimeout;

global.setInterval = ((handler: any, timeout?: any, ...args: any[]) => {
  const id = _origSetInterval(handler as any, timeout as any, ...args as any[]);
  try { _timerRegistry.intervals.add(id as any); } catch {}
  return id as any;
}) as any;

global.clearInterval = ((id?: any) => {
  try { _timerRegistry.intervals.delete(id); } catch {}
  return _origClearInterval(id as any);
}) as any;

global.setTimeout = ((handler: any, timeout?: any, ...args: any[]) => {
  const id = _origSetTimeout(handler as any, timeout as any, ...args as any[]);
  try { _timerRegistry.timeouts.add(id as any); } catch {}
  return id as any;
}) as any;

global.clearTimeout = ((id?: any) => {
  try { _timerRegistry.timeouts.delete(id); } catch {}
  return _origClearTimeout(id as any);
}) as any;

afterEach(() => {
  try {
    _timerRegistry.intervals.forEach((id) => _origClearInterval(id));
    _timerRegistry.timeouts.forEach((id) => _origClearTimeout(id));
    _timerRegistry.intervals.clear();
    _timerRegistry.timeouts.clear();
  } catch {}
});
