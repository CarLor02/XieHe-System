FROM golang:1.22-alpine AS builder

WORKDIR /src

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG GOPROXY=https://proxy.golang.org,direct
ARG GOSUMDB=sum.golang.org
ARG GONOPROXY
ARG GONOSUMDB

ENV GOPROXY=${GOPROXY} \
    GOSUMDB=${GOSUMDB} \
    GONOPROXY=${GONOPROXY} \
    GONOSUMDB=${GONOSUMDB}

COPY lib-go/go.mod lib-go/go.sum ./lib-go/
COPY logging-service/go.mod logging-service/go.sum ./logging-service/
WORKDIR /src/logging-service
RUN --mount=type=cache,id=xiehe-services-go-mod,target=/go/pkg/mod,sharing=locked \
    go mod download
WORKDIR /src
COPY lib-go ./lib-go
COPY logging-service ./logging-service
WORKDIR /src/logging-service
RUN --mount=type=cache,id=xiehe-services-go-mod,target=/go/pkg/mod,sharing=locked \
    --mount=type=cache,id=xiehe-services-go-build,target=/root/.cache/go-build,sharing=locked \
    CGO_ENABLED=0 GOOS=linux go build -o /out/logging-service ./cmd

FROM alpine:3.20
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy

RUN --mount=type=cache,id=xiehe-logging-runtime-apk,target=/var/cache/apk,sharing=locked \
    apk add --update-cache su-exec \
    && adduser -D -H -u 10001 appuser \
    && mkdir -p /var/lib/logging-service/spool /var/lib/logging-service/archive \
    && chown -R appuser:appuser /var/lib/logging-service
COPY logging-service/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=builder /out/logging-service /usr/local/bin/logging-service
EXPOSE 8091
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["logging-service"]
