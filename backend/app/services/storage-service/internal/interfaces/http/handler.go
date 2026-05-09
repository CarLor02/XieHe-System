package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"

	appstorage "xiehe-storage-service/internal/application/storage"
	domain "xiehe-storage-service/internal/domain/storage"
)

type Handler struct {
	storageService *appstorage.Service
	serviceToken   string
}

func NewHandler(storageService *appstorage.Service, serviceToken string) *Handler {
	return &Handler{storageService: storageService, serviceToken: serviceToken}
}

func (handler *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (handler *Handler) HandleEnsureBucket(w http.ResponseWriter, r *http.Request) {
	var request ensureBucketRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	err := handler.storageService.EnsureBucket(r.Context(), request.Bucket)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"bucket": request.Bucket})
}

func (handler *Handler) HandleCreateMultipart(w http.ResponseWriter, r *http.Request) {
	var request createMultipartRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	upload, err := handler.storageService.CreateMultipartUpload(
		r.Context(),
		toCreateMultipartDomain(request),
	)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":     upload.Bucket,
		"object_key": upload.ObjectKey,
		"upload_id":  upload.UploadID,
		"parts":      toPartURLs(upload.Parts),
	})
}

func (handler *Handler) HandleCompleteMultipart(w http.ResponseWriter, r *http.Request) {
	var request completeMultipartRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	result, err := handler.storageService.CompleteMultipartUpload(
		r.Context(),
		toCompleteMultipartDomain(request),
	)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":     result.Bucket,
		"object_key": result.ObjectKey,
		"etag":       result.ETag,
	})
}

func (handler *Handler) HandleAbortMultipart(w http.ResponseWriter, r *http.Request) {
	var request completeMultipartRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	err := handler.storageService.AbortMultipartUpload(r.Context(), toAbortMultipartDomain(request))
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "aborted"})
}

func (handler *Handler) HandlePresignGet(w http.ResponseWriter, r *http.Request) {
	var request objectRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	url, err := handler.storageService.PresignGetObject(
		r.Context(),
		domain.ObjectRef{Bucket: request.Bucket, ObjectKey: request.ObjectKey},
		request.ExpiresIn,
	)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": url})
}

func (handler *Handler) HandleStatObject(w http.ResponseWriter, r *http.Request) {
	var request objectRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	stat, err := handler.storageService.StatObject(
		r.Context(),
		domain.ObjectRef{Bucket: request.Bucket, ObjectKey: request.ObjectKey},
	)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":       stat.Bucket,
		"object_key":   stat.ObjectKey,
		"size":         stat.Size,
		"etag":         stat.ETag,
		"content_type": stat.ContentType,
		"metadata":     stat.Metadata,
	})
}

func (handler *Handler) HandleDeleteObject(w http.ResponseWriter, r *http.Request) {
	var request objectRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	err := handler.storageService.DeleteObject(
		r.Context(),
		domain.ObjectRef{Bucket: request.Bucket, ObjectKey: request.ObjectKey},
	)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (handler *Handler) HandlePutObject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	bucket, objectKey, ok := parseObjectPath(r.URL.Path)
	if !ok {
		writeError(w, http.StatusBadRequest, "path must be /objects/{bucket}/{object_key}")
		return
	}

	body, contentLength, err := seekableBody(r.Body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer func() {
		name := body.Name()
		_ = body.Close()
		_ = os.Remove(name)
	}()

	result, err := handler.storageService.PutObject(
		r.Context(),
		appstorage.PutObjectInput{
			Bucket:        bucket,
			ObjectKey:     objectKey,
			Body:          body,
			ContentLength: contentLength,
			ContentType:   r.Header.Get("Content-Type"),
		},
	)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":     result.Bucket,
		"object_key": result.ObjectKey,
		"etag":       result.ETag,
	})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	defer r.Body.Close()
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}

func parseObjectPath(path string) (string, string, bool) {
	trimmed := strings.TrimPrefix(path, "/objects/")
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrBucketRequired),
		errors.Is(err, domain.ErrObjectKeyRequired),
		errors.Is(err, domain.ErrInvalidPartCount),
		errors.Is(err, domain.ErrMultipartPartsRequired),
		errors.Is(err, domain.ErrUploadIDRequired):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, domain.ErrObjectNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	default:
		writeError(w, http.StatusBadGateway, err.Error())
	}
}
