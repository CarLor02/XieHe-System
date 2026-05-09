package httpapi

import "net/http"

const storageServiceTokenHeader = "X-Storage-Service-Token"

func withAuth(serviceToken string, handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get(storageServiceTokenHeader) != serviceToken {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		handler(w, r)
	}
}
