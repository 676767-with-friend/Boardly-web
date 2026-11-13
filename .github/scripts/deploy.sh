#!/usr/bin/env bash
set -euo pipefail
: "${IMAGE_TAG:?Set IMAGE_TAG to the tested commit SHA}"
[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected a full commit SHA' >&2; exit 1; }
[[ "$(git rev-parse HEAD)" == "$IMAGE_TAG" ]] || { echo 'Checkout does not match IMAGE_TAG' >&2; exit 1; }
KUBE_CONTEXT=boardly-dev
KUBE_NAMESPACE=boardly
# Always target the dedicated development profile, never the current context.
k() { kubectl --context "$KUBE_CONTEXT" -n "$KUBE_NAMESPACE" "$@"; }
minikube -p "$KUBE_CONTEXT" status
k wait --for=condition=Ready nodes --all --timeout=120s
# Bootstrap separately: releases must never rotate existing database credentials.
k get secret boardly-secret >/dev/null
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
on_error() {
  echo "Deployment failed for $IMAGE_TAG" >&2
  k get pods,deploy,jobs -o wide >&2 || true
  k logs job/boardly-db-migrate --tail=80 >&2 || true
}
trap on_error ERR
if [[ "${1:-}" == build ]]; then
  docker build -t "boardly-backend:$IMAGE_TAG" ./backend
  docker build -t "boardly-frontend:$IMAGE_TAG" -f frontend/Dockerfile .
  minikube -p "$KUBE_CONTEXT" image load "boardly-backend:$IMAGE_TAG" "boardly-frontend:$IMAGE_TAG"
  exit 0
fi
[[ "${1:-}" == deploy ]] || { echo 'Usage: deploy.sh build|deploy' >&2; exit 1; }
k create configmap boardly-db-init \
  --from-file=01-schema.sql=database/Boardly_schema.sql \
  --from-file=02-seed-dev.sql=database/seed-dev.sql \
  --from-file=001-create-notifications.sql=database/migrations/001-create-notifications.sql \
  --dry-run=client -o yaml | k apply -f -
k apply -f k8s/10-postgres.yaml
k rollout status deployment/boardly-db --timeout=180s
k delete job boardly-db-migrate --ignore-not-found --wait=true --timeout=60s
k apply -f k8s/15-db-migrate.yaml
k wait --for=condition=complete job/boardly-db-migrate --timeout=180s
# Render once so an intermediate :local revision is never deployed.
kubectl kustomize --load-restrictor=LoadRestrictionsNone k8s/local > "$work/all.yaml"
sed "s/boardly-backend:local/boardly-backend:$IMAGE_TAG/g; s/boardly-frontend:local/boardly-frontend:$IMAGE_TAG/g" "$work/all.yaml" > "$work/release.yaml"
k apply -f "$work/release.yaml"
k rollout status deployment/boardly-backend --timeout=240s
k rollout status deployment/boardly-frontend --timeout=180s
for app in backend frontend; do
  image=$(k get deployment "boardly-$app" -o jsonpath='{.spec.template.spec.containers[0].image}')
  [[ "$image" == "boardly-$app:$IMAGE_TAG" ]]
done
k --request-timeout=30s exec deployment/boardly-backend -- curl --fail --silent --show-error --max-time 15 http://localhost:8080/api/health
k --request-timeout=30s exec deployment/boardly-frontend -- wget -q -T 15 -O /dev/null http://127.0.0.1/
k --request-timeout=30s exec deployment/boardly-frontend -- wget -q -T 15 -O - http://127.0.0.1/api/health
echo "Deployed and smoke-tested $IMAGE_TAG" | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"
