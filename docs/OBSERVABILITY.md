# Boardly Observability (local development)

This optional stack adds Spring Boot Actuator, Prometheus metrics, OTLP traces, Loki log aggregation, and Grafana dashboards. The normal Compose workflow and production deployment stay unchanged. The observability profile is for local development only.

## Start

From the repository root, with Docker Desktop running:

\`\`\`powershell
docker compose -f compose.yaml -f compose.observability.yaml up -d --build --wait --wait-timeout 300
\`\`\`

On first run, Docker downloads the pinned images and builds the Boardly app. The stack keeps data in named volumes; it does not delete existing database data.

## Open

- App: http://localhost:8443
- Grafana: http://localhost:3000 (anonymous Viewer, local only)
- Prometheus: http://localhost:9090
- Backend health: http://localhost:8080/actuator/health
- Backend readiness, including PostgreSQL: http://localhost:8080/actuator/health/readiness
- Backend Prometheus metrics: http://localhost:8080/actuator/prometheus

Grafana provisions the **Boardly overview** dashboard and Prometheus, Loki, and Tempo data sources automatically. Make normal requests in the app, then use the dashboard for request volume, p95 latency, 5xx responses, JVM heap, and logs. Trace IDs and span IDs are attached to logs as Loki structured metadata, not as high-cardinality Loki labels.

The Postman collection at \`observability/postman/Boardly-Observability.postman_collection.json\` contains safe health, metrics, branch, and product read requests. Its \`baseUrl\` variable defaults to \`http://localhost:8080\`.

## Stop

\`\`\`powershell
docker compose -f compose.yaml -f compose.observability.yaml down
\`\`\`

This stops containers and keeps named volumes. Do not add \`-v\` unless you intentionally want to delete the saved data.

## Scope

- Actuator exposes only health, info, and Prometheus metrics; detailed health values remain hidden.
- Health readiness includes the database contributor.
- Grafana, Prometheus, and Loki host ports bind to loopback.
- Trace sampling defaults to 100% for local demo and can be changed with \`BOARDLY_TRACING_SAMPLING_PROBABILITY\`.
- No alert rules, frontend instrumentation, or production deployment changes are included.
