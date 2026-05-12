package httpapi

import "net/http"

// NewRouter wires health and authenticated v1 ingestion routes.
func NewRouter(handler *Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handler.HandleHealth)
	mux.HandleFunc("/v1/log-events", withAuth(handler.serviceToken, handler.HandleLogEvent))
	mux.HandleFunc("/v1/log-events/batch", withAuth(handler.serviceToken, handler.HandleLogEventBatch))
	return mux
}
