package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

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
