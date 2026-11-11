#!/usr/bin/env bash
set -euo pipefail

for name in IMAGE_REGISTRY IMAGE_TAG REGISTRY_USERNAME REGISTRY_PASSWORD K8S_DB_USERNAME K8S_DB_PASSWORD K8S_JWT_SECRET; do
  : "${!name:?Missing deployment variable: $name}"
done
if (( ${#K8S_JWT_SECRET} < 32 )); then
  echo 'Refusing deployment: K8S_JWT_SECRET must be at least 32 characters' >&2
  exit 1
fi

KUBE_NAMESPACE=boardly
KUBE_CONTEXT=minikube
current_context=$(kubectl config current-context)
if [[ "$current_context" != "$KUBE_CONTEXT" ]]; then
  echo "Refusing deployment: expected Kubernetes context $KUBE_CONTEXT, found $current_context" >&2
  exit 1
fi

kubectl apply -f k8s/00-namespace.yaml

secret_file=$(mktemp)
trap 'rm -f "$secret_file"' EXIT
chmod 600 "$secret_file"
printf 'DB_USERNAME=%s\nDB_PASSWORD=%s\nJWT_SECRET=%s\n' \
  "$K8S_DB_USERNAME" "$K8S_DB_PASSWORD" "$K8S_JWT_SECRET" > "$secret_file"
kubectl -n "$KUBE_NAMESPACE" create secret generic boardly-secret \
  --from-env-file="$secret_file" --dry-run=client -o yaml | kubectl apply -f -
rm -f "$secret_file"
trap - EXIT

registry_host=${IMAGE_REGISTRY%%/*}
kubectl -n "$KUBE_NAMESPACE" create secret docker-registry boardly-registry-pull \
  --docker-server="$registry_host" --docker-username="$REGISTRY_USERNAME" \
  --docker-password="$REGISTRY_PASSWORD" --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$KUBE_NAMESPACE" create configmap boardly-db-init \
  --from-file=01-schema.sql=database/Boardly_schema.sql \
  --from-file=02-seed-dev.sql=database/seed-dev.sql \
  --from-file=001-create-notifications.sql=database/migrations/001-create-notifications.sql \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/10-postgres.yaml
kubectl -n "$KUBE_NAMESPACE" rollout status deployment/boardly-db --timeout=180s

kubectl -n "$KUBE_NAMESPACE" delete job boardly-db-migrate --ignore-not-found --wait=true
kubectl apply -f k8s/15-db-migrate.yaml
if ! kubectl -n "$KUBE_NAMESPACE" wait --for=condition=complete job/boardly-db-migrate --timeout=120s; then
  kubectl -n "$KUBE_NAMESPACE" logs job/boardly-db-migrate
  exit 1
fi

kubectl apply -f k8s/20-backend.yaml
kubectl apply -f k8s/30-frontend.yaml
kubectl -n "$KUBE_NAMESPACE" set image deployment/boardly-backend backend="${IMAGE_REGISTRY}/boardly-backend:${IMAGE_TAG}"
kubectl -n "$KUBE_NAMESPACE" set image deployment/boardly-frontend frontend="${IMAGE_REGISTRY}/boardly-frontend:${IMAGE_TAG}"
kubectl -n "$KUBE_NAMESPACE" rollout status deployment/boardly-backend --timeout=180s
kubectl -n "$KUBE_NAMESPACE" rollout status deployment/boardly-frontend --timeout=120s

kubectl -n "$KUBE_NAMESPACE" run "smoke-test-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}" --rm -i --restart=Never \
  --image=curlimages/curl:8.12.1 --command -- sh -ec \
  'curl --fail --silent --show-error http://backend:8080/api/health; \
   curl --fail --silent --show-error --output /dev/null http://frontend/; \
   curl --fail --silent --show-error http://frontend/api/health'
