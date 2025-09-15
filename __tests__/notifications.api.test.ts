import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchNotifications, fetchUnreadCount, markRead, markAllRead, deleteOne, deleteBatch } from '../src/notifications/api';

// Helper to build fetch response mocks
const okJson = (data: any) => ({ ok: true, json: async () => data } as any);
const okText = (txt: string) => ({ ok: true, text: async () => txt } as any);
const notOk = () => ({ ok: false, text: async () => '' } as any);

describe('notifications/api unit tests', () => {
  beforeEach(async () => {
    (global as any).fetch = jest.fn();
    await (AsyncStorage.setItem as unknown as jest.Mock)('jwtToken', 'UNIT_JWT');
  });

  it('fetchNotifications returns list when backend responds array', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okJson([
      { id: 1, message: 'a' },
      { id: 2, message: 'b' }
    ]));

    const list = await fetchNotifications(0, 20, false);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(2);

    const [calledUrl, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(calledUrl)).toContain('/api/notifications');
    expect(opts.headers.Authorization).toBe('Bearer UNIT_JWT');
  });

  it('fetchNotifications extracts list from paginated object', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okJson({ content: [{ id: 3 }, { id: 4 }] }));
    const list = await fetchNotifications(1, 10, true);
    expect(list.map((x: any) => x.id)).toEqual([3, 4]);
  });

  it('fetchUnreadCount reads JSON body unreadCount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okText('{"unreadCount":7}'));
    const n = await fetchUnreadCount();
    expect(n).toBe(7);
  });

  it('fetchUnreadCount falls back to numeric text', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okText('5'));
    const n = await fetchUnreadCount();
    expect(n).toBe(5);
  });

  it('fetchUnreadCount throws on non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(notOk());
    await expect(fetchUnreadCount()).rejects.toThrow('fetchUnreadCount failed');
  });

  it('markRead posts to correct url and returns json', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okJson({ id: 9, message: 'ok' }));
    const res = await markRead(9);
    expect(res.id).toBe(9);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls.pop();
    expect(String(url)).toMatch(/\/api\/notifications\/9\/read$/);
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer UNIT_JWT');
  });

  it('markAllRead posts to correct endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true } as any);
    await expect(markAllRead()).resolves.toBeUndefined();
    const [url, opts] = (global.fetch as jest.Mock).mock.calls.pop();
    expect(String(url)).toMatch(/\/api\/notifications\/mark-all-read$/);
    expect(opts.method).toBe('POST');
  });

  it('deleteOne sends DELETE to correct endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true } as any);
    await expect(deleteOne(5)).resolves.toBeUndefined();
    const [url, opts] = (global.fetch as jest.Mock).mock.calls.pop();
    expect(String(url)).toMatch(/\/api\/notifications\/5$/);
    expect(opts.method).toBe('DELETE');
  });

  it('deleteBatch posts ids payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true } as any);
    await expect(deleteBatch([1,2,3])).resolves.toBeUndefined();
    const [url, opts] = (global.fetch as jest.Mock).mock.calls.pop();
    expect(String(url)).toMatch(/\/api\/notifications\/delete-batch$/);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ ids: [1,2,3] });
  });
});
