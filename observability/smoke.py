#!/usr/bin/env python3
"""Verify real metrics, logs and a correlated trace via Grafana. Python stdlib only."""
import base64
import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

GRAFANA = os.getenv("GRAFANA_URL", "http://localhost:3000").rstrip("/")
API = os.getenv("BOARDLY_API_URL", "http://localhost:8080").rstrip("/")
credentials = base64.b64encode(
    (os.getenv("GRAFANA_ADMIN_USER", "admin") + ":" +
     os.getenv("GRAFANA_ADMIN_PASSWORD", "boardly-local-admin")).encode()
).decode()


def get(base, path, authenticated=False):
    headers = {"Authorization": "Basic " + credentials} if authenticated else {}
    with urlopen(Request(base + path, headers=headers), timeout=10) as response:
        return json.load(response)


def grafana(path):
    return get(GRAFANA, path, True)


def eventually(label, check, seconds=180):
    deadline = time.monotonic() + seconds
    last_error = "no data"
    while time.monotonic() < deadline:
        try:
            result = check()
            if result:
                print("PASS:", label, flush=True)
                return result
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError) as error:
            last_error = str(error)
        time.sleep(3)
    raise SystemExit("FAIL: " + label + " (" + last_error + ")")


def metric(query):
    return grafana("/api/datasources/proxy/uid/prometheus/api/v1/query?" +
                   urlencode({"query": query}))["data"]["result"]


def request_log():
    result = grafana("/api/datasources/proxy/uid/loki/loki/api/v1/query_range?" + urlencode({
        "query": '{service_name="boardly-backend"} | json | message =~ "HTTP .*route=/api/health .*"',
        "since": "5m", "limit": 100,
    }))["data"]["result"]
    for stream in result:
        for _, line in stream["values"]:
            trace_id = json.loads(line).get("traceId")
            if trace_id and len(trace_id) == 32:
                return trace_id
    return None


eventually("Grafana ready", lambda: grafana("/api/health")["database"] == "ok")
eventually("Backend health", lambda: get(API, "/api/health")["status"] == "ok")
# Several requests ensure the HTTP timer and rate panels have samples.
for _ in range(5):
    get(API, "/api/health")
eventually("Prometheus scrapes backend", lambda: any(
    row["value"][1] == "1" for row in metric('up{job="boardly-backend"}')))
eventually("HTTP request metrics", lambda: metric(
    'http_server_requests_seconds_count{job="boardly-backend",uri="/api/health"}'))
trace_id = eventually("Loki request log contains traceId", request_log)
eventually("Same trace exists in Tempo", lambda: grafana(
    "/api/datasources/proxy/uid/tempo/api/traces/" + trace_id).get("batches"))
dashboard = grafana("/api/dashboards/uid/boardly-overview")["dashboard"]
assert len(dashboard["panels"]) == 10, "Boardly dashboard missing panels"
print("PASS: Boardly dashboard provisioned", flush=True)
eventually("Tempo TraceQL search", lambda: grafana(
    "/api/datasources/proxy/uid/tempo/api/search?" + urlencode({
        "q": '{ resource.service.name = "boardly-backend" }', "limit": 5,
    })).get("traces"))
# Tempo in this Grafana version does not implement the data source health API;
# the real trace lookup and TraceQL search above verify its connection instead.
for uid in ("prometheus", "loki"):
    assert grafana("/api/datasources/uid/" + uid + "/health")["status"] == "OK", uid
print("PASS: all Grafana data sources healthy", flush=True)
print("Observability smoke test passed.")
