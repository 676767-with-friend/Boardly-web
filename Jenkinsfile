// Jenkinsfile — Boardly CI/CD pipeline
//
// Requires on the Jenkins agent: Docker, JDK 21 + Maven 3.9+, Node 22 + pnpm (via corepack),
// kubectl, and access to a Minikube cluster (KUBECONFIG pointed at it, e.g. via the
// `minikube` Jenkins credential/service account). CD also requires the
// `boardly-db-creds` username/password and `boardly-jwt-secret` secret text credentials.
//
// Suggested Jenkins plugins: Pipeline, Git, Docker Pipeline, JUnit, Credentials Binding,
// Kubernetes CLI (or just kubectl on PATH), Slack Notification (optional).

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        IMAGE_TAG        = ''
        BACKEND_IMAGE    = ''
        FRONTEND_IMAGE   = ''
        KUBE_NAMESPACE   = 'boardly'
        KUBE_CONTEXT     = 'minikube'
        TEST_DB_CONTAINER = "boardly-test-db-${env.BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()}"
                    env.BACKEND_IMAGE = "boardly-backend:${env.IMAGE_TAG}"
                    env.FRONTEND_IMAGE = "boardly-frontend:${env.IMAGE_TAG}"
                }
            }
        }

        stage('Start Test Database') {
            steps {
                sh '''
                    set -eu
                    if docker container inspect ${TEST_DB_CONTAINER} >/dev/null 2>&1; then
                        docker rm -f ${TEST_DB_CONTAINER}
                    fi
                    docker run -d --name ${TEST_DB_CONTAINER} \
                        -e POSTGRES_DB=boardly_db -e POSTGRES_USER=boardly -e POSTGRES_PASSWORD=boardly \
                        -p 5432:5432 postgres:16-alpine

                    echo "Waiting for Postgres to accept connections..."
                    ready=false
                    for i in $(seq 1 30); do
                        if docker exec ${TEST_DB_CONTAINER} pg_isready -U boardly -d boardly_db; then
                            ready=true
                            break
                        fi
                        sleep 2
                    done
                    [ "$ready" = true ]

                    docker cp database/Boardly_schema.sql ${TEST_DB_CONTAINER}:/schema.sql
                    docker cp database/seed-dev.sql ${TEST_DB_CONTAINER}:/seed.sql
                    docker exec ${TEST_DB_CONTAINER} psql -v ON_ERROR_STOP=1 -U boardly -d boardly_db -f /schema.sql
                    docker exec ${TEST_DB_CONTAINER} psql -v ON_ERROR_STOP=1 -U boardly -d boardly_db -f /seed.sql
                '''
            }
        }

        stage('Backend: Build & Test') {
            steps {
                dir('backend') {
                    withEnv([
                        'DB_URL=jdbc:postgresql://localhost:5432/boardly_db',
                        'DB_USERNAME=boardly',
                        'DB_PASSWORD=boardly',
                        'SPRING_PROFILES_ACTIVE=test',
                        'JWT_SECRET=jenkins-ci-jwt-secret-at-least-32-characters-long'
                    ]) {
                        sh 'mvn -B clean verify'
                    }
                }
            }
            post {
                always {
                    junit testResults: 'backend/target/surefire-reports/*.xml', allowEmptyResults: false
                }
            }
        }

        stage('Frontend: Build & Test') {
            steps {
                dir('frontend') {
                    sh '''
                        corepack enable
                        corepack prepare pnpm@10.34.3 --activate
                        pnpm install --frozen-lockfile
                        pnpm build
                        CI=true pnpm test:coverage
                    '''
                }
            }
            post {
                always {
                    junit testResults: 'frontend/reports/vitest-junit.xml', allowEmptyResults: false
                }
            }
        }

        stage('Docker: Build Images') {
            steps {
                sh '''
                    docker build -t "$BACKEND_IMAGE" ./backend
                    docker build -t "$FRONTEND_IMAGE" -f frontend/Dockerfile .
                '''
            }
        }

        stage('Docker: Push Images') {
            when { branch 'main' }
            steps {
                withCredentials([
                    string(credentialsId: 'boardly-registry-url', variable: 'IMAGE_REGISTRY'),
                    usernamePassword(credentialsId: 'boardly-registry-creds', usernameVariable: 'REGISTRY_USERNAME', passwordVariable: 'REGISTRY_PASSWORD')
                ]) {
                    sh '''
                        set -eu
                        registry_host="${IMAGE_REGISTRY%%/*}"
                        remote_backend="$IMAGE_REGISTRY/boardly-backend:$IMAGE_TAG"
                        remote_frontend="$IMAGE_REGISTRY/boardly-frontend:$IMAGE_TAG"
                        docker_config=$(mktemp -d)
                        trap 'rm -rf "$docker_config"' EXIT
                        export DOCKER_CONFIG="$docker_config"
                        printf '%s' "$REGISTRY_PASSWORD" | docker login "$registry_host" --username "$REGISTRY_USERNAME" --password-stdin
                        docker tag "$BACKEND_IMAGE" "$remote_backend"
                        docker tag "$FRONTEND_IMAGE" "$remote_frontend"
                        docker push "$remote_backend"
                        docker push "$remote_frontend"
                    '''
                    script {
                        env.BACKEND_IMAGE = "${env.IMAGE_REGISTRY}/boardly-backend:${env.IMAGE_TAG}"
                        env.FRONTEND_IMAGE = "${env.IMAGE_REGISTRY}/boardly-frontend:${env.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Deploy: Minikube') {
            when { branch 'main' }
            steps {
                withCredentials([
                    string(credentialsId: 'boardly-registry-url', variable: 'IMAGE_REGISTRY'),
                    usernamePassword(credentialsId: 'boardly-registry-creds', usernameVariable: 'REGISTRY_USERNAME', passwordVariable: 'REGISTRY_PASSWORD'),
                    usernamePassword(credentialsId: 'boardly-db-creds', usernameVariable: 'K8S_DB_USERNAME', passwordVariable: 'K8S_DB_PASSWORD'),
                    string(credentialsId: 'boardly-jwt-secret', variable: 'K8S_JWT_SECRET')
                ]) {
                    sh '''
                        set -eu
                        current_context=$(kubectl config current-context)
                        if [ "$current_context" != "$KUBE_CONTEXT" ]; then
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

                        registry_host="${IMAGE_REGISTRY%%/*}"
                        kubectl -n "$KUBE_NAMESPACE" create secret docker-registry boardly-registry-pull \
                            --docker-server="$registry_host" --docker-username="$REGISTRY_USERNAME" \
                            --docker-password="$REGISTRY_PASSWORD" --dry-run=client -o yaml | kubectl apply -f -
                        kubectl -n "$KUBE_NAMESPACE" patch serviceaccount default --type=merge \
                            -p '{"imagePullSecrets":[{"name":"boardly-registry-pull"}]}'

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
                        kubectl -n "$KUBE_NAMESPACE" set image deployment/boardly-backend backend="$BACKEND_IMAGE"
                        kubectl -n "$KUBE_NAMESPACE" set image deployment/boardly-frontend frontend="$FRONTEND_IMAGE"
                        kubectl -n "$KUBE_NAMESPACE" rollout status deployment/boardly-backend --timeout=180s
                        kubectl -n "$KUBE_NAMESPACE" rollout status deployment/boardly-frontend --timeout=120s
                    '''
                }
            }
        }

        stage('Smoke Test') {
            when { branch 'main' }
            steps {
                sh '''
                    kubectl -n "$KUBE_NAMESPACE" run "smoke-test-${BUILD_NUMBER}" --rm -i --restart=Never \
                        --image=curlimages/curl:8.12.1 --command -- sh -ec \
                        'curl --fail --silent --show-error http://backend:8080/api/health; \
                         curl --fail --silent --show-error --output /dev/null http://frontend/; \
                         curl --fail --silent --show-error http://frontend/api/health'
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'backend/target/site/jacoco/**, frontend/coverage/**', allowEmptyArchive: true
            sh '''
                if docker container inspect ${TEST_DB_CONTAINER} >/dev/null 2>&1; then
                    docker rm -f ${TEST_DB_CONTAINER}
                fi
            '''
            cleanWs()
        }
        failure {
            echo "Build ${env.BUILD_NUMBER} failed on branch ${env.BRANCH_NAME}. Check the stage logs above."
            // slackSend(channel: '#boardly-ci', color: 'danger', message: "Boardly build ${env.BUILD_NUMBER} failed")
        }
        success {
            echo "Build ${env.BUILD_NUMBER} (${BACKEND_IMAGE} / ${FRONTEND_IMAGE}) completed successfully."
        }
    }
}
