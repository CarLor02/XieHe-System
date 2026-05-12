package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	applogging "xiehe-logging-service/internal/application/logging"
	"xiehe-logging-service/internal/config"
	"xiehe-logging-service/internal/infrastructure/filesink"
	kafkapub "xiehe-logging-service/internal/infrastructure/kafka"
	"xiehe-logging-service/internal/interfaces/console"
	httpapi "xiehe-logging-service/internal/interfaces/http"
)

// main wires configuration, sinks, Kafka publishing, and the HTTP server lifecycle.
func main() {
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	var publisher applogging.Publisher = kafkapub.NoopPublisher{}
	if cfg.KafkaEnabled {
		publisher = kafkapub.NewPublisher(cfg.KafkaBrokers, cfg.KafkaTopic)
		if closer, ok := publisher.(interface{ Close() error }); ok {
			defer func() {
				if err := closer.Close(); err != nil {
					log.Printf("kafka publisher close failed: %v", err)
				}
			}()
		}
	}

	service := applogging.NewService(
		applogging.Config{
			FlushInterval: cfg.FlushInterval,
			QueueSize:     cfg.QueueSize,
			MaxBatchSize:  cfg.MaxBatchSize,
		},
		[]applogging.BatchSink{
			&console.Sink{Writer: os.Stdout, Color: cfg.ConsoleColor},
			filesink.New(cfg.SpoolFile, filesink.AllEvents),
			filesink.New(cfg.ErrorAuditFile, filesink.ErrorAndAuditOnly),
		},
		publisher,
	)
	service.Start(ctx)

	handler := httpapi.NewHandler(service, cfg.ServiceToken)
	server := &http.Server{Addr: cfg.Addr, Handler: httpapi.NewRouter(handler)}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithCancel(context.Background())
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("logging-service shutdown failed: %v", err)
		}
	}()

	log.Printf("logging-service listening on %s", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
