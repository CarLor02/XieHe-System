package main

import (
	"net/http"
	"testing"
	"time"

	"xiehe-logging-service/internal/config"
)

func TestNewHTTPServerUsesConfiguredTimeouts(t *testing.T) {
	cfg := config.Config{
		Addr:              ":9091",
		ReadHeaderTimeout: 2 * time.Second,
		ReadTimeout:       3 * time.Second,
		WriteTimeout:      4 * time.Second,
		IdleTimeout:       5 * time.Second,
	}

	server := newHTTPServer(cfg, http.NewServeMux())

	if server.Addr != cfg.Addr {
		t.Fatalf("unexpected addr: %s", server.Addr)
	}
	if server.ReadHeaderTimeout != cfg.ReadHeaderTimeout {
		t.Fatalf("unexpected read header timeout: %s", server.ReadHeaderTimeout)
	}
	if server.ReadTimeout != cfg.ReadTimeout {
		t.Fatalf("unexpected read timeout: %s", server.ReadTimeout)
	}
	if server.WriteTimeout != cfg.WriteTimeout {
		t.Fatalf("unexpected write timeout: %s", server.WriteTimeout)
	}
	if server.IdleTimeout != cfg.IdleTimeout {
		t.Fatalf("unexpected idle timeout: %s", server.IdleTimeout)
	}
}
