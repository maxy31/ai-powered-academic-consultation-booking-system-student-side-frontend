export async function parseJsonSafely(res: { text: () => Promise<string>; url?: string; status?: number }) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    // Keep error generic; callers can decide how to surface
    console.warn('Invalid JSON from', res?.url, 'status', res?.status, 'body:', text);
    throw new Error('Received invalid JSON from server');
  }
}
