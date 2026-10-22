import type { XieheApiSdk } from '@xiehe/api-sdk';
import type { SessionUser } from '@xiehe/api-contracts';
export interface AvatarFile {
  name: string;
  size: number;
  mimeType: string;
  readChunk(start: number, end: number): Promise<ArrayBuffer>;
}
export interface ProfileGateway {
  get: () => Promise<SessionUser>;
  update: XieheApiSdk['auth']['updateSessionUser'];
  changePassword: XieheApiSdk['auth']['changePassword'];
  uploadAvatar(file: AvatarFile): Promise<SessionUser>;
  removeAvatar(): Promise<SessionUser>;
}
