import type { HttpApi } from '@stellarmesh/sdk';
import type {
  AnnotationBatchRequest,
  AnnotationBatchResult,
  AnnotationHistoryVersionResult,
  AnnotationSaveResponse,
  BatchExamTypeResult,
  BatchUpdateExamTypeRequest,
  ImageFileResponse,
  ImageMutationResult,
  ImageNavigationResult,
  ImageStatisticsResult,
  PaginatedData_AnnotationHistoryItemResult_,
  PaginatedData_AssignableTeamResult_,
  PaginatedData_ImageFileResponse_,
  PaginatedData_ImageUploaderResult_,
  RequestGetAnnotationHistoryVersion,
  RequestGetImageFileDetail,
  RequestGetImageStats,
  RequestGetPatientImages,
  RequestListAnnotationHistory,
  RequestListAssignableImageTeams,
  RequestListImageFiles,
  RequestListNavigationIds,
  RequestListVisibleImageUploaders,
  RequestRenameImageFile,
  RequestSaveAnnotation,
  RequestUpdateExamType,
  RequestUpdateImageInfo,
} from '@xiehe/api-contracts/generated';

export function createImagingApi(http: HttpApi) {
  return {
    requestGetAnnotationHistoryVersion: http.post<
      RequestGetAnnotationHistoryVersion,
      AnnotationHistoryVersionResult
    >('/api/v1/image-files/annotation-history/get'),
    requestListAnnotationHistory: http.post<
      RequestListAnnotationHistory,
      PaginatedData_AnnotationHistoryItemResult_
    >('/api/v1/image-files/annotation-history/list'),
    requestSaveAnnotation: http.post<
      RequestSaveAnnotation,
      AnnotationSaveResponse
    >('/api/v1/image-files/annotation/save'),
    requestGetAnnotationBatch: http.post<
      AnnotationBatchRequest,
      AnnotationBatchResult
    >('/api/v1/image-files/annotations/batch'),
    requestListAssignableImageTeams: http.post<
      RequestListAssignableImageTeams,
      PaginatedData_AssignableTeamResult_
    >('/api/v1/image-files/assignable-teams'),
    requestBatchUpdateExamType: http.post<
      BatchUpdateExamTypeRequest,
      BatchExamTypeResult
    >('/api/v1/image-files/batch/exam-type'),
    requestUpdateExamType: http.post<RequestUpdateExamType, ImageFileResponse>(
      '/api/v1/image-files/exam-type/update'
    ),
    requestGetImageFileDetail: http.post<
      RequestGetImageFileDetail,
      ImageFileResponse
    >('/api/v1/image-files/get'),
    requestUpdateImageInfo: http.post<
      RequestUpdateImageInfo,
      ImageMutationResult
    >('/api/v1/image-files/info/update'),
    requestListImageFiles: http.post<
      RequestListImageFiles,
      PaginatedData_ImageFileResponse_
    >('/api/v1/image-files/list'),
    requestListNavigationIds: http.post<
      RequestListNavigationIds,
      ImageNavigationResult
    >('/api/v1/image-files/navigation'),
    requestGetPatientImages: http.post<
      RequestGetPatientImages,
      PaginatedData_ImageFileResponse_
    >('/api/v1/image-files/patient/list'),
    requestRenameImageFile: http.post<
      RequestRenameImageFile,
      ImageFileResponse
    >('/api/v1/image-files/rename'),
    requestGetImageStats: http.post<
      RequestGetImageStats,
      ImageStatisticsResult
    >('/api/v1/image-files/stats/summary'),
    requestListVisibleImageUploaders: http.post<
      RequestListVisibleImageUploaders,
      PaginatedData_ImageUploaderResult_
    >('/api/v1/image-files/uploaders'),
  };
}
