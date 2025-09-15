import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

describe('App smoke test', () => {
  it('renders root app without crashing', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<App />);
    });
  });
});
