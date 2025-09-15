import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { navigationRef } from '../src/notifications/navigationRef';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Simple fetch mock helper
const jsonResponse = (status: number, body?: any) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
  url: 'mock://',
} as any);

describe.skip('Happy path flow: login -> main -> profile', () => {
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    // Ensure clean storage state
    (AsyncStorage.clear as unknown as jest.Mock | undefined)?.mockResolvedValue?.(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Mock fetch per endpoint
    global.fetch = jest.fn(async (input: any, init?: any) => {
      const url = String(input);
      if (url.endsWith('/api/auth/loginStudent') && init?.method === 'POST') {
        return jsonResponse(200, { token: 'TEST_JWT' });
      }
      if (url.endsWith('/api/profile/getProfileStudent')) {
        return jsonResponse(200, { studentName: 'Alice', username: 'U123' });
      }
      if (url.endsWith('/api/appointments/getLatestBooking')) {
        return jsonResponse(200, { id: 3, date: '2025-09-17', startTime: '08:00:00' });
      }
      return jsonResponse(204);
    }) as any;
  });

  it('runs through core flow without crashing and shows profile data', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });

    // Find LoginScreen inputs & button
    const root = renderer!.root as ReactTestRenderer.ReactTestInstance;
    const inputs = root.findAllByType(require('react-native').TextInput);
    const usernameInput = inputs.find(i => i.props.placeholder === 'Username');
    const passwordInput = inputs.find(i => i.props.placeholder === 'Password');
    expect(usernameInput && passwordInput).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      usernameInput!.props.onChangeText('alice');
      passwordInput!.props.onChangeText('p@ss');
    });

    const loginBtn = root.findAllByProps({ accessibilityLabel: 'Login' })[0];
    expect(loginBtn).toBeTruthy();

    // Press login -> should navigate to Main (stack replace)
    await ReactTestRenderer.act(async () => {
      await loginBtn.props.onPress();
    });
    await flush();
    await flush();

    // Navigate to Profile tab programmatically to trigger data fetch
    // Try programmatic navigation (navigationRef becomes ready shortly after NavigationContainer mounts)
    if (navigationRef.isReady()) {
      await ReactTestRenderer.act(async () => {
        // @ts-ignore
        navigationRef.navigate('Profile');
      });
    }
    await flush();
    await flush();
    await flush();

    // Wait a microtask for fetch + state updates
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });

    // Assert that profile texts exist in tree
    const allTexts = root.findAllByType(require('react-native').Text).map(t => String(t.props.children));
    const hasName = allTexts.some(t => t.includes('Alice'));
    const hasId = allTexts.some(t => t.includes('U123'));
    const hasBookingDate = allTexts.some(t => t.includes('2025-09-17'));
    const hasBookingTime = allTexts.some(t => t.includes('08:00:00'));

    expect(hasName).toBe(true);
    expect(hasId).toBe(true);
    expect(hasBookingDate).toBe(true);
    expect(hasBookingTime).toBe(true);
    // Cleanup to avoid open handles
    renderer!.unmount();
  });

  afterAll(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});
