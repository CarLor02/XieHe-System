package httpapi

import (
	"encoding/json"
	"io"
	"net/http"

	applogging "xiehe-logging-service/internal/application/logging"
	domain "xiehe-logging-service/internal/domain/logging"
)

// Handler exposes the HTTP API used by backend services to emit log events.
type Handler struct {
	service      *applogging.Service
	serviceToken string
}

// NewHandler binds the application service and shared service token to HTTP handlers.
func NewHandler(service *applogging.Service, serviceToken string) *Handler {
	return &Handler{service: service, serviceToken: serviceToken}
}

// HandleHealth reports process liveness.
func (handler *Handler) HandleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleLogEvent accepts one LogEvent and enqueues it for batched processing.
func (handler *Handler) HandleLogEvent(w http.ResponseWriter, r *http.Request) {
	var request logEventIngestRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	if err := handler.service.Ingest(r.Context(), []domain.LogEvent{request.Event}); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]int{"accepted": 1})
}

// HandleLogEventBatch accepts multiple LogEvent records in one request.
func (handler *Handler) HandleLogEventBatch(w http.ResponseWriter, r *http.Request) {
	var request logEventBatchIngestRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	if err := handler.service.Ingest(r.Context(), request.Events); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]int{"accepted": len(request.Events)})
}

// decodeJSON reads a bounded JSON request body into the target DTO.
func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	defer r.Body.Close()
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}
