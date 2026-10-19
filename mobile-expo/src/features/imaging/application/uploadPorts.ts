import type {
  CompleteUploadRequest,
  CreateImageUploadSessionRequest,
  UploadSession,
  UploadStatusRecord,
} from '@xiehe/api-contracts';

export interface ImageUploadGateway {
  createSession(
    request: CreateImageUploadSessionRequest
  ): Promise<UploadSession>;
  completeSession(
    sessionId: string,
    request: CompleteUploadRequest
  ): Promise<UploadStatusRecord>;
  getStatus(sessionId: string): Promise<UploadStatusRecord>;
}
