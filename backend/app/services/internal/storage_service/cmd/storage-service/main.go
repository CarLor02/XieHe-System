package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type app struct {
	client        *s3.Client
	presign       *s3.PresignClient
	serviceToken  string
	defaultRegion string
}

type ensureBucketRequest struct {
	Bucket string `json:"bucket"`
}

type createMultipartRequest struct {
	Bucket      string            `json:"bucket"`
	ObjectKey   string            `json:"object_key"`
	ContentType string            `json:"content_type"`
	Metadata    map[string]string `json:"metadata"`
	PartCount   int               `json:"part_count"`
	ExpiresIn   int               `json:"expires_in"`
}

type partURL struct {
	PartNumber int    `json:"part_number"`
	URL        string `json:"url"`
}

type completePart struct {
	PartNumber int    `json:"part_number"`
	ETag       string `json:"etag"`
}

type completeMultipartRequest struct {
	Bucket    string         `json:"bucket"`
	ObjectKey string         `json:"object_key"`
	UploadID  string         `json:"upload_id"`
	Parts     []completePart `json:"parts"`
}

type objectRequest struct {
	Bucket    string `json:"bucket"`
	ObjectKey string `json:"object_key"`
	ExpiresIn int    `json:"expires_in"`
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func endpointResolver(endpoint string) aws.EndpointResolverWithOptions {
	return aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{URL: endpoint, HostnameImmutable: true}, nil
	})
}

func newS3Client(endpoint, region, accessKey, secretKey string) *s3.Client {
	cfg := aws.Config{
		Region: region,
		Credentials: aws.NewCredentialsCache(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
		EndpointResolverWithOptions: endpointResolver(endpoint),
	}
	return s3.NewFromConfig(cfg, func(options *s3.Options) {
		options.UsePathStyle = true
	})
}

func main() {
	region := env("MINIO_REGION", "us-east-1")
	internalEndpoint := env("MINIO_INTERNAL_ENDPOINT", "http://minio:9000")
	publicEndpoint := env("MINIO_PUBLIC_ENDPOINT", "http://localhost:3030")
	accessKey := env("MINIO_ACCESS_KEY", "minioadmin")
	secretKey := env("MINIO_SECRET_KEY", "minioadmin")
	addr := env("STORAGE_SERVICE_ADDR", ":8090")

	internalClient := newS3Client(internalEndpoint, region, accessKey, secretKey)
	publicClient := newS3Client(publicEndpoint, region, accessKey, secretKey)
	server := &app{
		client:        internalClient,
		presign:       s3.NewPresignClient(publicClient),
		serviceToken:  env("STORAGE_SERVICE_TOKEN", "dev-storage-service-token"),
		defaultRegion: region,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", server.handleHealth)
	mux.HandleFunc("/buckets/ensure", server.withAuth(server.handleEnsureBucket))
	mux.HandleFunc("/multipart/create", server.withAuth(server.handleCreateMultipart))
	mux.HandleFunc("/multipart/complete", server.withAuth(server.handleCompleteMultipart))
	mux.HandleFunc("/multipart/abort", server.withAuth(server.handleAbortMultipart))
	mux.HandleFunc("/presign/get", server.withAuth(server.handlePresignGet))
	mux.HandleFunc("/objects/stat", server.withAuth(server.handleStatObject))
	mux.HandleFunc("/objects/delete", server.withAuth(server.handleDeleteObject))
	mux.HandleFunc("/objects/", server.withAuth(server.handlePutObject))

	log.Printf("storage-service listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func (a *app) withAuth(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Storage-Service-Token") != a.serviceToken {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		handler(w, r)
	}
}

func (a *app) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *app) handleEnsureBucket(w http.ResponseWriter, r *http.Request) {
	var req ensureBucketRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Bucket == "" {
		writeError(w, http.StatusBadRequest, "bucket is required")
		return
	}
	ctx := r.Context()
	_, err := a.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(req.Bucket)})
	if err != nil {
		_, err = a.client.CreateBucket(ctx, &s3.CreateBucketInput{Bucket: aws.String(req.Bucket)})
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"bucket": req.Bucket})
}

func (a *app) handleCreateMultipart(w http.ResponseWriter, r *http.Request) {
	var req createMultipartRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.PartCount <= 0 || req.Bucket == "" || req.ObjectKey == "" {
		writeError(w, http.StatusBadRequest, "bucket, object_key and positive part_count are required")
		return
	}
	expires := expiresDuration(req.ExpiresIn)
	out, err := a.client.CreateMultipartUpload(r.Context(), &s3.CreateMultipartUploadInput{
		Bucket:      aws.String(req.Bucket),
		Key:         aws.String(req.ObjectKey),
		ContentType: aws.String(req.ContentType),
		Metadata:    req.Metadata,
	})
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	parts := make([]partURL, 0, req.PartCount)
	for partNumber := 1; partNumber <= req.PartCount; partNumber++ {
		presigned, err := a.presign.PresignUploadPart(
			context.Background(),
			&s3.UploadPartInput{
				Bucket:     aws.String(req.Bucket),
				Key:        aws.String(req.ObjectKey),
				UploadId:   out.UploadId,
				PartNumber: aws.Int32(int32(partNumber)),
			},
			func(options *s3.PresignOptions) { options.Expires = expires },
		)
		if err != nil {
			_, _ = a.client.AbortMultipartUpload(r.Context(), &s3.AbortMultipartUploadInput{
				Bucket:   aws.String(req.Bucket),
				Key:      aws.String(req.ObjectKey),
				UploadId: out.UploadId,
			})
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		parts = append(parts, partURL{PartNumber: partNumber, URL: presigned.URL})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":     req.Bucket,
		"object_key": req.ObjectKey,
		"upload_id":  aws.ToString(out.UploadId),
		"parts":      parts,
	})
}

func (a *app) handleCompleteMultipart(w http.ResponseWriter, r *http.Request) {
	var req completeMultipartRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Bucket == "" || req.ObjectKey == "" || req.UploadID == "" || len(req.Parts) == 0 {
		writeError(w, http.StatusBadRequest, "bucket, object_key, upload_id and parts are required")
		return
	}
	sort.Slice(req.Parts, func(i, j int) bool { return req.Parts[i].PartNumber < req.Parts[j].PartNumber })
	parts := make([]types.CompletedPart, 0, len(req.Parts))
	for _, part := range req.Parts {
		etag := normalizeETag(part.ETag)
		parts = append(parts, types.CompletedPart{
			ETag:       aws.String(etag),
			PartNumber: aws.Int32(int32(part.PartNumber)),
		})
	}
	out, err := a.client.CompleteMultipartUpload(r.Context(), &s3.CompleteMultipartUploadInput{
		Bucket:   aws.String(req.Bucket),
		Key:      aws.String(req.ObjectKey),
		UploadId: aws.String(req.UploadID),
		MultipartUpload: &types.CompletedMultipartUpload{
			Parts: parts,
		},
	})
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":     req.Bucket,
		"object_key": req.ObjectKey,
		"etag":       strings.Trim(aws.ToString(out.ETag), "\""),
	})
}

func (a *app) handleAbortMultipart(w http.ResponseWriter, r *http.Request) {
	var req completeMultipartRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	_, err := a.client.AbortMultipartUpload(r.Context(), &s3.AbortMultipartUploadInput{
		Bucket:   aws.String(req.Bucket),
		Key:      aws.String(req.ObjectKey),
		UploadId: aws.String(req.UploadID),
	})
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "aborted"})
}

func (a *app) handlePresignGet(w http.ResponseWriter, r *http.Request) {
	var req objectRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	presigned, err := a.presign.PresignGetObject(
		context.Background(),
		&s3.GetObjectInput{Bucket: aws.String(req.Bucket), Key: aws.String(req.ObjectKey)},
		func(options *s3.PresignOptions) { options.Expires = expiresDuration(req.ExpiresIn) },
	)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"url": presigned.URL})
}

func (a *app) handleStatObject(w http.ResponseWriter, r *http.Request) {
	var req objectRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	out, err := a.client.HeadObject(r.Context(), &s3.HeadObjectInput{
		Bucket: aws.String(req.Bucket),
		Key:    aws.String(req.ObjectKey),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":       req.Bucket,
		"object_key":   req.ObjectKey,
		"size":         aws.ToInt64(out.ContentLength),
		"etag":         strings.Trim(aws.ToString(out.ETag), "\""),
		"content_type": aws.ToString(out.ContentType),
		"metadata":     out.Metadata,
	})
}

func (a *app) handleDeleteObject(w http.ResponseWriter, r *http.Request) {
	var req objectRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	_, err := a.client.DeleteObject(r.Context(), &s3.DeleteObjectInput{
		Bucket: aws.String(req.Bucket),
		Key:    aws.String(req.ObjectKey),
	})
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (a *app) handlePutObject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	bucket, objectKey, ok := parseObjectPath(r.URL.Path)
	if !ok {
		writeError(w, http.StatusBadRequest, "path must be /objects/{bucket}/{object_key}")
		return
	}
	contentType := r.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	out, err := a.client.PutObject(r.Context(), &s3.PutObjectInput{
		Bucket:        aws.String(bucket),
		Key:           aws.String(objectKey),
		Body:          r.Body,
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(r.ContentLength),
	})
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":     bucket,
		"object_key": objectKey,
		"etag":       strings.Trim(aws.ToString(out.ETag), "\""),
	})
}

func parseObjectPath(path string) (string, string, bool) {
	trimmed := strings.TrimPrefix(path, "/objects/")
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func normalizeETag(etag string) string {
	trimmed := strings.TrimSpace(etag)
	if strings.HasPrefix(trimmed, "\"") && strings.HasSuffix(trimmed, "\"") {
		return trimmed
	}
	return fmt.Sprintf("\"%s\"", strings.Trim(trimmed, "\""))
}

func expiresDuration(seconds int) time.Duration {
	if seconds <= 0 {
		seconds = 900
	}
	return time.Duration(seconds) * time.Second
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

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	code := status
	message := "操作成功"
	if status >= 400 {
		message = "请求失败"
	}
	_ = json.NewEncoder(w).Encode(map[string]any{
		"code":      code,
		"message":   message,
		"data":      payload,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"code":      status,
		"message":   message,
		"data":      nil,
		"timestamp": time.Now().Format(time.RFC3339),
		"error":     strconv.Itoa(status),
	})
}
