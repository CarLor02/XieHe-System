package httpapi

import "net/http"

const serviceTokenHeader = "X-Logging-Service-Token"

// withAuth checks the shared service token before forwarding ingest requests.
func withAuth(serviceToken string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if serviceToken != "" && r.Header.Get(serviceTokenHeader) != serviceToken {
			writeError(w, http.StatusUnauthorized, "invalid logging service token")
			return
		}
		next(w, r)
	}
}
