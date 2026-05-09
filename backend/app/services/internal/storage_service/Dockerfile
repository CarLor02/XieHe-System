FROM golang:1.22-alpine AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/storage-service ./cmd/storage-service

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
USER appuser
COPY --from=builder /out/storage-service /usr/local/bin/storage-service
EXPOSE 8090
ENTRYPOINT ["storage-service"]
