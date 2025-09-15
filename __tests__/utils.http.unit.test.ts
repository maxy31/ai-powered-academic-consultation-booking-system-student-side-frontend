import { parseJsonSafely } from '../src/utils/http';

test('parseJsonSafely returns null on empty body', async () => {
  const res = { text: async () => '' } as any;
  const out = await parseJsonSafely(res);
  expect(out).toBeNull();
});

test('parseJsonSafely parses valid json', async () => {
  const res = { text: async () => '{"a":1}', url: 'u', status: 200 } as any;
  const out = await parseJsonSafely(res);
  expect(out).toEqual({ a: 1 });
});

test('parseJsonSafely throws on invalid json', async () => {
  const res = { text: async () => '{bad', url: 'u', status: 200 } as any;
  await expect(parseJsonSafely(res)).rejects.toThrow('Received invalid JSON from server');
});
