package console

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	domain "xiehe-logging-service/internal/domain/logging"
)

// Separator is the plain-text delimiter used by logging-service console output.
const Separator = "   |   "

const reset = "\x1b[0m"

var levelColors = map[domain.LogLevel]string{
	domain.LogLevelDebug:   "\x1b[32m",
	domain.LogLevelInfo:    "\x1b[37m",
	domain.LogLevelWarning: "\x1b[33m",
	domain.LogLevelError:   "\x1b[31m",
	domain.LogLevelAudit:   "\x1b[38;5;208m",
}

type messagePayload struct {
	Message  string         `json:"message"`
	TraceID  string         `json:"trace_id"`
	Metadata map[string]any `json:"metadata"`
}

// FormatLine renders one event as timestamp, level, service, and JSON message fields.
func FormatLine(event domain.LogEvent, color bool) (string, error) {
	message, err := json.Marshal(messagePayload{
		Message:  event.Message,
		TraceID:  event.TraceID,
		Metadata: event.Metadata,
	})
	if err != nil {
		return "", err
	}

	level := string(event.Level)
	if color {
		if colorCode, ok := levelColors[event.Level]; ok {
			level = colorCode + level + reset
		}
	}

	return strings.Join([]string{
		event.Timestamp.UTC().Format("2006-01-02T15:04:05.000Z07:00"),
		level,
		event.Service,
		string(message),
	}, Separator), nil
}

// Sink writes formatted events to a console writer.
type Sink struct {
	Writer io.Writer
	Color  bool
}

// WriteBatch prints each event in the batch using the console formatter.
func (sink *Sink) WriteBatch(_ context.Context, events []domain.LogEvent) error {
	for _, event := range events {
		line, err := FormatLine(event, sink.Color)
		if err != nil {
			return err
		}
		if _, err := fmt.Fprintln(sink.Writer, line); err != nil {
			return err
		}
	}
	return nil
}
