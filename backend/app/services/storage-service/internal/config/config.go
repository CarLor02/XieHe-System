package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr               string
	ServiceToken       string
	MinIORegion        string
	InternalEndpoint   string
	PublicEndpoint     string
	AccessKey          string
	SecretKey          string
	ReadHeaderTimeout  time.Duration
	ReadTimeout        time.Duration
	WriteTimeout       time.Duration
	IdleTimeout        time.Duration
	MaxUploadBodyBytes int64
}

const defaultMaxUploadBodyBytes int64 = 512 << 20

// Load reads environment variables and applies local development defaults.
func Load() Config {
	return Config{
		Addr:               env("STORAGE_SERVICE_ADDR", ":8090"),
		ServiceToken:       env("STORAGE_SERVICE_TOKEN", "dev-storage-service-token"),
		MinIORegion:        env("MINIO_REGION", "us-east-1"),
		InternalEndpoint:   env("MINIO_INTERNAL_ENDPOINT", "http://minio:9000"),
		PublicEndpoint:     env("MINIO_PUBLIC_ENDPOINT", "http://localhost:3030"),
		AccessKey:          env("MINIO_ACCESS_KEY", "minioadmin"),
		SecretKey:          env("MINIO_SECRET_KEY", "minioadmin"),
		ReadHeaderTimeout:  envDuration("STORAGE_SERVICE_READ_HEADER_TIMEOUT", 5*time.Second),
		ReadTimeout:        envDuration("STORAGE_SERVICE_READ_TIMEOUT", 30*time.Second),
		WriteTimeout:       envDuration("STORAGE_SERVICE_WRITE_TIMEOUT", 120*time.Second),
		IdleTimeout:        envDuration("STORAGE_SERVICE_IDLE_TIMEOUT", 60*time.Second),
		MaxUploadBodyBytes: envInt64("STORAGE_SERVICE_MAX_UPLOAD_BYTES", defaultMaxUploadBodyBytes),
	}
}

// env returns a trimmed environment value or the provided fallback.
func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

// envDuration parses a duration value with units, or a positive seconds value.
func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	if parsed, err := time.ParseDuration(value); err == nil && parsed > 0 {
		return parsed
	}
	if seconds, err := strconv.ParseInt(value, 10, 64); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	return fallback
}

// envInt64 parses a positive integer value or returns the fallback.
func envInt64(key string, fallback int64) int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
