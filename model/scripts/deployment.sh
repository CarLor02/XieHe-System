#!/bin/bash

# Shared by source-build and tar-image deployment entrypoints.
wait_for_model_container() {
    local container_name="$1"
    local deadline=$((SECONDS + 120))
    local snapshot status health restarts

    while (( SECONDS < deadline )); do
        if ! snapshot=$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} {{.RestartCount}}' "$container_name"); then
            break
        fi
        read -r status health restarts <<< "$snapshot"
        if [[ "$status" == "exited" || "$status" == "dead" || "$status" == "restarting" || "$restarts" != "0" ]]; then
            echo "Container failed during startup: $snapshot" >&2
            break
        fi
        if [[ "$status" == "running" && "$health" == "healthy" ]]; then
            docker ps --filter "name=^/${container_name}$" --format '{{.Names}}: {{.Status}}'
            return 0
        fi
        sleep 2
    done

    echo "Model service did not become healthy within 120 seconds: $container_name" >&2
    docker logs --tail 100 "$container_name" >&2 || true
    return 1
}
