# Boardly on Kubernetes (Minikube)

## Prerequisites
Docker Desktop, minikube, kubectl.

## Deploy
```powershell
minikube start --driver=docker --memory=3072

docker build -t boardly-backend:local ./backend
docker build -t boardly-frontend:local -f frontend/Dockerfile .
minikube image load boardly-backend:local
minikube image load boardly-frontend:local

kubectl apply -f k8s/00-namespace.yaml
kubectl create secret generic boardly-secret -n boardly --from-literal=DB_USERNAME=boardly --from-literal=DB_PASSWORD=boardly --from-literal=JWT_SECRET=<at-least-32-characters>
kubectl create configmap boardly-db-init -n boardly --from-file=01-schema.sql=database/Boardly_schema.sql --from-file=02-seed-dev.sql=database/seed-dev.sql

kubectl apply -f k8s/10-postgres.yaml
kubectl apply -f k8s/20-backend.yaml
kubectl apply -f k8s/30-frontend.yaml
```

## Access
```powershell
kubectl port-forward svc/frontend 8443:80 -n boardly
```
Open http://localhost:8443 (same demo logins as the root README).

## Reset database
```powershell
kubectl delete deploy boardly-db -n boardly
kubectl delete pvc boardly-db-data -n boardly
kubectl apply -f k8s/10-postgres.yaml
```

## Notes
- `kubectl proxy` cannot serve this app: its `/api` path collides with the Kubernetes API. Use `port-forward`.
- The Secret and ConfigMap are created by command and are not stored in git. Dev credentials only.