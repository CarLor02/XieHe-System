package config

import (
	"os"
	"strings"
)

type Config struct {
	Addr             string
	ServiceToken     string
	MinIORegion      string
	InternalEndpoint string
	PublicEndpoint   string
	AccessKey        string
	SecretKey        string
}

func Load() Config {
	return Config{
		Addr:             env("STORAGE_SERVICE_ADDR", ":8090"),
		ServiceToken:     env("STORAGE_SERVICE_TOKEN", "dev-storage-service-token"),
		MinIORegion:      env("MINIO_REGION", "us-east-1"),
		InternalEndpoint: env("MINIO_INTERNAL_ENDPOINT", "http://minio:9000"),
		PublicEndpoint:   env("MINIO_PUBLIC_ENDPOINT", "http://localhost:3030"),
		AccessKey:        env("MINIO_ACCESS_KEY", "minioadmin"),
		SecretKey:        env("MINIO_SECRET_KEY", "minioadmin"),
	}
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
