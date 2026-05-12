package httpapi

import (
	"encoding/json"
	"net/http"
	"time"
)

// writeJSON wraps successful payloads in the ApiEnvelope-compatible response shape.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	message := "操作成功"
	if status >= http.StatusBadRequest {
		message = "请求失败"
	}

	_ = json.NewEncoder(w).Encode(map[string]any{
		"code":      status,
		"message":   message,
		"data":      payload,
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
	})
}

// writeError wraps API errors in the same envelope shape with error metadata.
func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(map[string]any{
		"code":       status,
		"message":    message,
		"data":       nil,
		"error_code": http.StatusText(status),
		"timestamp":  time.Now().UTC().Format(time.RFC3339Nano),
	})
}
