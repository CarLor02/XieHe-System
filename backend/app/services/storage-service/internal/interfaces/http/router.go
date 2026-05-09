package httpapi

import "net/http"

func NewRouter(handler *Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handler.HandleHealth)
	mux.HandleFunc("/buckets/ensure", withAuth(handler.serviceToken, handler.HandleEnsureBucket))
	mux.HandleFunc("/multipart/create", withAuth(handler.serviceToken, handler.HandleCreateMultipart))
	mux.HandleFunc("/multipart/complete", withAuth(handler.serviceToken, handler.HandleCompleteMultipart))
	mux.HandleFunc("/multipart/abort", withAuth(handler.serviceToken, handler.HandleAbortMultipart))
	mux.HandleFunc("/presign/get", withAuth(handler.serviceToken, handler.HandlePresignGet))
	mux.HandleFunc("/objects/stat", withAuth(handler.serviceToken, handler.HandleStatObject))
	mux.HandleFunc("/objects/delete", withAuth(handler.serviceToken, handler.HandleDeleteObject))
	mux.HandleFunc("/objects/", withAuth(handler.serviceToken, handler.HandlePutObject))
	return mux
}
