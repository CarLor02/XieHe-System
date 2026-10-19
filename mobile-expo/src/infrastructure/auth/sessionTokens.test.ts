import { describe, expect, it } from 'vitest';
import { createBoundSessionTokenStore } from './sessionTokens';

function storage() {
  let value: string | null = null;
  return {
    read: async () => value,
    async write(next: string) {
      value = next;
    },
    async remove() {
      value = null;
    },
  };
}
describe('persisted mobile session ownership', () => {
  it('never supplies one server with another server’s tokens', async () => {
    const disk = storage();
    const first = createBoundSessionTokenStore('https://first.example', disk);
    const second = createBoundSessionTokenStore('https://second.example', disk);
    await first.save({ accessToken: 'access-a', refreshToken: 'refresh-a' });
    expect(await second.getAccessToken()).toBeNull();
    await second.clear();
    expect(await first.getAccessToken()).toBe('access-a');
  });
  it('does not resurrect a signed-out session when a refresh response arrives late', async () => {
    const disk = storage();
    const store = createBoundSessionTokenStore('https://first.example', disk);
    await store.save({ accessToken: 'access-a', refreshToken: 'refresh-a' });
    await store.clear();
    await expect(
      store.save({ accessToken: 'late-access', refreshToken: 'late-refresh' })
    ).rejects.toThrow();
    expect(await disk.read()).toBeNull();
  });
  it('does not let stale unauthorized requests clear or overwrite a new login on the same server', async () => {
    const disk = storage();
    const old = createBoundSessionTokenStore('https://first.example', disk);
    await old.save({ accessToken: 'access-a', refreshToken: 'refresh-a' });
    const current = createBoundSessionTokenStore('https://first.example', disk);
    await current.save({ accessToken: 'access-b', refreshToken: 'refresh-b' });
    await expect(
      old.save({ accessToken: 'late-access', refreshToken: 'late-refresh' })
    ).rejects.toThrow();
    await old.clear();
    expect(await current.getAccessToken()).toBe('access-b');
  });
});
