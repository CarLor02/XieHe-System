import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@xiehe/api-client';
import type { XieheApiSdk } from '@xiehe/api-sdk';
import { uploadAvatar } from './uploadAvatar';

function setup() {
  const auth = {
    createAvatarUploadSession: vi
      .fn<XieheApiSdk['auth']['createAvatarUploadSession']>()
      .mockResolvedValue({
        upload_id: 'avatar-test',
        object_key: 'avatar',
        storage_bucket: 'test',
        expires_in: 60,
        part_size: 4,
        parts: [
          { part_number: 1, url: 'https://storage.test/1' },
          { part_number: 2, url: 'https://storage.test/2' },
        ],
      }),
    completeAvatarUpload: vi.fn<XieheApiSdk['auth']['completeAvatarUpload']>(),
    getSessionUser: vi.fn<XieheApiSdk['auth']['getSessionUser']>(),
  };
  const requests: Parameters<HttpClient['requestWithMetadata']>[0][] = [];
  let etag = true;
  const storage: Pick<HttpClient, 'requestWithMetadata'> = {
    async requestWithMetadata<T>(
      request: Parameters<HttpClient['requestWithMetadata']>[0]
    ) {
      requests.push(request);
      return {
        data: '' as T,
        status: 200,
        headers: (etag ? { etag: '"part-test"' } : {}) as Record<
          string,
          string
        >,
      };
    },
  };
  const file = {
    name: 'avatar.png',
    mimeType: 'image/png',
    size: 6,
    readChunk: async (start: number, end: number) =>
      new Uint8Array([1, 2, 3, 4, 5, 6]).slice(start, end).buffer,
  };
  return {
    auth,
    storage,
    file,
    requests,
    omitEtag: () => {
      etag = false;
    },
  };
}
describe('avatar upload application', () => {
  it('uploads exact bytes without API authentication and completes before refreshing the profile', async () => {
    const { auth, storage, file, requests } = setup();
    await uploadAvatar(auth, storage, file);
    expect(
      requests.map(r => ({
        method: r.method,
        auth: r.auth,
        bytes: Array.from(new Uint8Array(r.data as ArrayBuffer)),
      }))
    ).toEqual([
      { method: 'PUT', auth: 'none', bytes: [1, 2, 3, 4] },
      { method: 'PUT', auth: 'none', bytes: [5, 6] },
    ]);
    expect(auth.completeAvatarUpload).toHaveBeenCalledWith({
      upload_id: 'avatar-test',
      parts: [
        { part_number: 1, etag: 'part-test' },
        { part_number: 2, etag: 'part-test' },
      ],
    });
    expect(auth.getSessionUser.mock.invocationCallOrder[0]).toBeGreaterThan(
      auth.completeAvatarUpload.mock.invocationCallOrder[0]
    );
  });
  it('never completes or changes profile when a storage ETag is absent', async () => {
    const { auth, storage, file, omitEtag } = setup();
    omitEtag();
    await expect(uploadAvatar(auth, storage, file)).rejects.toThrow('ETag');
    expect(auth.completeAvatarUpload).not.toHaveBeenCalled();
    expect(auth.getSessionUser).not.toHaveBeenCalled();
  });
  it('does not refresh profile after completion fails', async () => {
    const { auth, storage, file } = setup();
    auth.completeAvatarUpload.mockRejectedValue(new Error('failed'));
    await expect(uploadAvatar(auth, storage, file)).rejects.toThrow('failed');
    expect(auth.getSessionUser).not.toHaveBeenCalled();
  });
});
