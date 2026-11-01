import { describe, expect, it, vi } from 'vitest';
import type { MobileUploadFile } from '@/features/imaging/domain/upload';
import {
  ImageUploadSession,
  type ImageUploadPorts,
} from './ImageUploadSession';

function file(name: string): MobileUploadFile {
  return {
    name,
    uri: `file:///${name}`,
    mimeType: 'image/png',
    size: 8,
    readChunk: async (start, end) => new Uint8Array(8).slice(start, end).buffer,
    release: vi.fn(),
  };
}
function setup(names = ['front.png', 'side.png']) {
  const originals = names.map(file);
  const ports = {
    pick: vi
      .fn<ImageUploadPorts['pick']>()
      .mockResolvedValue({ files: originals, errors: [] }),
    flip: vi
      .fn<ImageUploadPorts['flip']>()
      .mockImplementation(async source => file(`flipped-${source.name}`)),
    crop: vi
      .fn<ImageUploadPorts['crop']>()
      .mockImplementation(async source => file(`cropped-${source.name}`)),
    upload: vi.fn<ImageUploadPorts['upload']>().mockResolvedValue(100),
  };
  const session = new ImageUploadSession(ports);
  const closeAll = () => {
    while (session.getSnapshot().options.activeFileId) session.closeEditor();
  };
  return { session, ports, originals, closeAll };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('image upload application', () => {
  it('queues selected files for individual options and appends later selections', async () => {
    const { session, ports } = setup();
    await session.pick('gallery');
    const [first, second] = session.getSnapshot().entries;
    expect(session.getSnapshot().options.activeFileId).toBe(first.id);
    session.setExamType('侧位X光片');
    session.setTeams([{ id: 3, name: '团队三' }]);
    session.closeEditor();
    expect(session.getSnapshot().options.activeFileId).toBe(second.id);
    expect(session.getSnapshot().entries[1].teams).toEqual([]);
    session.remove(second.id);
    expect(session.getSnapshot().options.activeFileId).toBeNull();
    ports.pick.mockResolvedValueOnce({
      files: [file('third.png')],
      errors: ['bad.gif：不支持'],
    });
    await session.pick('file');
    expect(session.getSnapshot().entries.map(entry => entry.file.name)).toEqual(
      ['front.png', 'third.png']
    );
    expect(session.getSnapshot().entries[0]).toMatchObject({
      examType: '侧位X光片',
      teams: [{ id: 3 }],
    });
    expect(session.getSnapshot().error).toContain('bad.gif');
    expect(session.getSnapshot().options.activeFileId).toBe(
      session.getSnapshot().entries[1].id
    );
  });

  it('re-crops the uncropped source, mirrors both source and current crop, and can restore the original', async () => {
    const { session, ports, originals } = setup();
    await session.pick('file');
    await session.editPixels('crop');
    const firstCrop = session.getSnapshot().entries[0].file;
    await session.editPixels('flip');
    expect(ports.flip.mock.calls.map(args => args[0])).toEqual([
      originals[0],
      firstCrop,
    ]);
    const source = session.getSnapshot().entries[0].cropSourceFile;
    await session.editPixels('crop');
    expect(ports.crop).toHaveBeenLastCalledWith(source);
    expect(session.getSnapshot().entries[0]).toMatchObject({
      cropped: true,
      flipped: true,
    });
    expect(session.getSnapshot().entries[1].file).toBe(originals[1]);
    session.resetImage();
    expect(session.getSnapshot().entries[0]).toMatchObject({
      file: originals[0],
      cropped: false,
      flipped: false,
    });
    expect(firstCrop.release).toHaveBeenCalledTimes(1);
    expect(originals[0].release).not.toHaveBeenCalled();
  });

  it('keeps original bytes when crop is cancelled or a later flip fails', async () => {
    const { session, ports } = setup();
    await session.pick('file');
    ports.crop.mockResolvedValueOnce(null);
    const original = session.getSnapshot().entries[0];
    await session.editPixels('crop');
    expect(session.getSnapshot().entries[0]).toBe(original);
    await session.editPixels('crop');
    const before = session.getSnapshot().entries[0];
    const temporary = file('temporary.png');
    ports.flip
      .mockResolvedValueOnce(temporary)
      .mockRejectedValueOnce(new Error('cannot flip'));
    await session.editPixels('flip');
    expect(session.getSnapshot().entries[0]).toBe(before);
    expect(temporary.release).toHaveBeenCalledOnce();
    expect(session.getSnapshot().error).toContain('cannot flip');
  });

  it('uploads edited bytes and per-file metadata, and retries only unfinished entries', async () => {
    const { session, ports, closeAll } = setup();
    await session.pick('file');
    session.setTeams([{ id: 4, name: '团队四' }]);
    await session.editPixels('crop');
    const edited = session.getSnapshot().entries[0].file;
    session.closeEditor();
    session.setExamType('侧位X光片');
    closeAll();
    ports.upload
      .mockResolvedValueOnce(101)
      .mockRejectedValueOnce(new Error('网络异常'));
    await session.upload(7);
    expect(ports.upload.mock.calls[0].slice(0, 4)).toEqual([
      edited,
      7,
      '正位X光片',
      [4],
    ]);
    expect(ports.upload.mock.calls[1][2]).toBe('侧位X光片');
    expect(session.getSnapshot().entries.map(entry => entry.status)).toEqual([
      'completed',
      'error',
    ]);
    const successId = session.getSnapshot().entries[0].id;
    await session.upload(7, successId);
    expect(ports.upload).toHaveBeenCalledTimes(2);
    await session.upload(7);
    expect(ports.upload).toHaveBeenCalledTimes(3);
    expect(ports.upload.mock.calls[2][0].name).toBe('side.png');
    expect(session.getSnapshot().entries.map(entry => entry.status)).toEqual([
      'completed',
      'completed',
    ]);
  });

  it('requires patient/options completion and prevents duplicate runs or mutation while uploading', async () => {
    const { session, ports, closeAll } = setup(['1.png', '2.png', '3.png']);
    await session.pick('file');
    await session.upload(7);
    expect(ports.upload).not.toHaveBeenCalled();
    closeAll();
    await session.upload(null);
    expect(session.getSnapshot().error).toBe('请选择患者');
    const first = deferred<number>();
    const second = deferred<number>();
    ports.upload
      .mockImplementationOnce(
        async (_file, _patient, _exam, _teams, progress) => {
          progress(100);
          return first.promise;
        }
      )
      .mockReturnValueOnce(second.promise);
    const running = session.upload(7);
    await session.upload(7);
    session.clear();
    session.remove(session.getSnapshot().entries[0].id);
    expect(ports.upload).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot().entries).toHaveLength(3);
    expect(session.getSnapshot().entries[0]).toMatchObject({
      status: 'uploading',
      progress: 99,
    });
    first.resolve(1);
    await vi.waitFor(() => expect(ports.upload).toHaveBeenCalledTimes(3));
    second.resolve(2);
    await running;
    expect(
      session.getSnapshot().entries.every(entry => entry.status === 'completed')
    ).toBe(true);
  });

  it('releases generated files on removal and waits for in-flight upload before disposing', async () => {
    const { session, ports, closeAll } = setup(['1.png']);
    await session.pick('file');
    await session.editPixels('flip');
    const flipped = session.getSnapshot().entries[0].file;
    closeAll();
    const pending = deferred<number>();
    ports.upload.mockReturnValueOnce(pending.promise);
    const running = session.upload(7);
    session.dispose();
    expect(flipped.release).not.toHaveBeenCalled();
    pending.resolve(7);
    await running;
    expect(flipped.release).toHaveBeenCalledOnce();
    expect(session.getSnapshot().entries).toHaveLength(0);
  });
});
