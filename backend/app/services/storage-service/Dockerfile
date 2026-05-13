FROM golang:1.22-alpine AS builder

WORKDIR /src

# 构建阶段代理和 Go module proxy 配置。仅 builder 阶段可见，不进入最终运行镜像。
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

COPY go.mod go.sum ./
# --mount=type=cache 把 Go module 缓存留在宿主机，重建时跳过已下载的依赖
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/storage-service ./cmd

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
USER appuser
COPY --from=builder /out/storage-service /usr/local/bin/storage-service
EXPOSE 8090
ENTRYPOINT ["storage-service"]
