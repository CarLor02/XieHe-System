package kafka

import (
	"context"
	"encoding/json"
	"time"

	segmentio "github.com/segmentio/kafka-go"

	domain "xiehe-logging-service/internal/domain/logging"
)

// Publisher writes logging events to a Kafka topic using kafka-go.
type Publisher struct {
	writer *segmentio.Writer
}

// NewPublisher creates a Kafka publisher for the configured brokers and topic.
func NewPublisher(brokers []string, topic string) *Publisher {
	return &Publisher{
		writer: &segmentio.Writer{
			Addr:         segmentio.TCP(brokers...),
			Topic:        topic,
			RequiredAcks: segmentio.RequireOne,
			Balancer:     &segmentio.Hash{},
			BatchTimeout: 100 * time.Millisecond,
		},
	}
}

// Publish serializes a batch of events and sends them as Kafka messages.
func (publisher *Publisher) Publish(ctx context.Context, events []domain.LogEvent) error {
	if len(events) == 0 {
		return nil
	}

	messages := make([]segmentio.Message, 0, len(events))
	for _, event := range events {
		payload, err := json.Marshal(event)
		if err != nil {
			return err
		}
		messages = append(messages, segmentio.Message{
			Key:   []byte(event.TraceID),
			Value: payload,
			Time:  event.Timestamp,
		})
	}
	return publisher.writer.WriteMessages(ctx, messages...)
}

// Close releases the underlying Kafka writer.
func (publisher *Publisher) Close() error {
	return publisher.writer.Close()
}

// NoopPublisher satisfies the publisher interface when Kafka is disabled.
type NoopPublisher struct{}

// Publish accepts events without sending them anywhere.
func (NoopPublisher) Publish(context.Context, []domain.LogEvent) error {
	return nil
}
