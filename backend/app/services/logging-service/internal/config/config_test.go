package config

import (
	"reflect"
	"testing"
)

func TestLoadDoesNotExposeKafkaOptionalSwitch(t *testing.T) {
	configType := reflect.TypeOf(Load())
	if _, ok := configType.FieldByName("Kafka" + "Enabled"); ok {
		t.Fatal("Config must not expose Kafka enabled switch because Kafka is required")
	}
}

func TestLoadReadsKafkaBrokersAndTopic(t *testing.T) {
	t.Setenv("LOGGING_KAFKA_BROKERS", "kafka-a:9092,kafka-b:9092")
	t.Setenv("LOGGING_KAFKA_TOPIC", "logging.events.v1")

	cfg := Load()

	if !reflect.DeepEqual(cfg.KafkaBrokers, []string{"kafka-a:9092", "kafka-b:9092"}) {
		t.Fatalf("unexpected brokers: %#v", cfg.KafkaBrokers)
	}
	if cfg.KafkaTopic != "logging.events.v1" {
		t.Fatalf("unexpected topic: %q", cfg.KafkaTopic)
	}
}
