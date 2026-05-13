package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is the environment-derived runtime configuration for logging-service.
type Config struct {
	Addr              string
	ServiceToken      string
	DataDir           string
	ConsoleColor      bool
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
	FlushInterval     time.Duration
	QueueSize         int
	MaxBatchSize      int
	KafkaBrokers      []string
	KafkaTopic        string
	SpoolFile         string
	ErrorAuditFile    string
}

// Load reads environment variables and applies local development defaults.
func Load() Config {
	dataDir := env("LOGGING_SERVICE_DATA_DIR", "/var/lib/logging-service")
	return Config{
		Addr:              env("LOGGING_SERVICE_ADDR", ":8091"),
		ServiceToken:      env("LOGGING_SERVICE_TOKEN", "dev-logging-service-token"),
		DataDir:           dataDir,
		ConsoleColor:      envBool("LOGGING_CONSOLE_COLOR", true),
		ReadHeaderTimeout: envDuration("LOGGING_SERVICE_READ_HEADER_TIMEOUT", 5*time.Second),
		ReadTimeout:       envDuration("LOGGING_SERVICE_READ_TIMEOUT", 10*time.Second),
		WriteTimeout:      envDuration("LOGGING_SERVICE_WRITE_TIMEOUT", 10*time.Second),
		IdleTimeout:       envDuration("LOGGING_SERVICE_IDLE_TIMEOUT", 60*time.Second),
		ShutdownTimeout:   envDuration("LOGGING_SERVICE_SHUTDOWN_TIMEOUT", 10*time.Second),
		FlushInterval:     time.Duration(envInt("LOGGING_BATCH_FLUSH_MS", 500)) * time.Millisecond,
		QueueSize:         envInt("LOGGING_QUEUE_SIZE", 4096),
		MaxBatchSize:      envInt("LOGGING_MAX_BATCH_SIZE", 512),
		KafkaBrokers:      envCSV("LOGGING_KAFKA_BROKERS", "kafka:9092"),
		KafkaTopic:        env("LOGGING_KAFKA_TOPIC", "logging.events.v1"),
		SpoolFile:         env("LOGGING_SPOOL_FILE", dataDir+"/spool/events.jsonl"),
		ErrorAuditFile:    env("LOGGING_ERROR_AUDIT_FILE", dataDir+"/archive/error_audit.jsonl"),
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

// envInt parses an integer environment value or returns the fallback.
func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
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
	if seconds, err := strconv.Atoi(value); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	return fallback
}

// envBool parses common truthy environment values or returns the fallback.
func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

// envCSV parses a comma-separated environment value into non-empty tokens.
func envCSV(key, fallback string) []string {
	raw := env(key, fallback)
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		if value := strings.TrimSpace(part); value != "" {
			values = append(values, value)
		}
	}
	return values
}
