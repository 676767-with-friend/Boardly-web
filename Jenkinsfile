// Jenkinsfile — Boardly CI/CD pipeline
//
// Requires on the Jenkins agent: Docker, JDK 21 + Maven 3.9+, Node 22 + pnpm (via corepack),
// kubectl, and access to a Minikube cluster (KUBECONFIG pointed at it, e.g. via the
// `minikube` Jenkins credential/service account).
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
        REGISTRY        = credentials('boardly-registry-url')      // e.g. docker.io/yourorg  (Secret text credential)
        REGISTRY_AUTH   = credentials('boardly-registry-creds')    // Username/password credential for `docker login`
        IMAGE_TAG        = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'local'}"
        BACKEND_IMAGE    = "${REGISTRY}/boardly-backend:${IMAGE_TAG}"
        FRONTEND_IMAGE   = "${REGISTRY}/boardly-frontend:${IMAGE_TAG}"
        KUBE_NAMESPACE   = 'boardly'
        TEST_DB_CONTAINER = "boardly-test-db-${env.BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Start Test Database') {
            steps {
                sh '''
                    docker rm -f ${TEST_DB_CONTAINER} 2>/dev/null || true
                    docker run -d --name ${TEST_DB_CONTAINER} \
                        -e POSTGRES_DB=boardly_db -e POSTGRES_USER=boardly -e POSTGRES_PASSWORD=boardly \
                        -p 5432:5432 postgres:16-alpine

                    echo "Waiting for Postgres to accept connections..."
                    for i in $(seq 1 30); do
                        docker exec ${TEST_DB_CONTAINER} pg_isready -U boardly -d boardly_db && break
                        sleep 2
                    done

                    docker cp database/Boardly_schema.sql ${TEST_DB_CONTAINER}:/schema.sql
                    docker cp database/seed-dev.sql ${TEST_DB_CONTAINER}:/seed.sql
                    docker exec ${TEST_DB_CONTAINER} psql -U boardly -d boardly_db -f /schema.sql
                    docker exec ${TEST_DB_CONTAINER} psql -U boardly -d boardly_db -f /seed.sql
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
                        'JWT_SECRET=jenkins-ci-jwt-secret-at-least-32-characters-long'
                    ]) {
                        sh 'mvn -B clean verify'
                    }
                }
            }
            post {
                always {
                    junit testResults: 'backend/target/surefire-reports/*.xml', allowEmptyResults: true
                }
            }
        }

        stage('Frontend: Build') {
            steps {
                dir('frontend') {
                    sh '''
                        corepack enable
                        corepack prepare pnpm@10.34.3 --activate
                        pnpm install --frozen-lockfile
                        pnpm build
                    '''
                }
                // Placeholder for when frontend tests/e2e exist (see notes below):
                // dir('frontend') { sh 'pnpm test' }
                // dir('frontend') { sh 'pnpm exec playwright test' }
            }
        }

        stage('Docker: Build Images') {
            steps {
                sh """
                    docker build -t ${BACKEND_IMAGE} ./backend
                    docker build -t ${FRONTEND_IMAGE} -f frontend/Dockerfile .
                """
            }
        }

        stage('Docker: Push Images') {
            when { branch 'main' }
            steps {
                sh """
                    echo "\$REGISTRY_AUTH_PSW" | docker login \$REGISTRY --username "\$REGISTRY_AUTH_USR" --password-stdin
                    docker push ${BACKEND_IMAGE}
                    docker push ${FRONTEND_IMAGE}
                """
            }
        }

        stage('Deploy: Minikube') {
            when { branch 'main' }
            steps {
                sh """
                    kubectl apply -f k8s/00-namespace.yaml
                    kubectl apply -f k8s/10-postgres.yaml
                    kubectl apply -f k8s/20-backend.yaml
                    kubectl apply -f k8s/30-frontend.yaml

                    kubectl -n ${KUBE_NAMESPACE} set image deployment/boardly-backend backend=${BACKEND_IMAGE}
                    kubectl -n ${KUBE_NAMESPACE} set image deployment/boardly-frontend frontend=${FRONTEND_IMAGE}

                    kubectl -n ${KUBE_NAMESPACE} rollout status deployment/boardly-backend --timeout=180s
                    kubectl -n ${KUBE_NAMESPACE} rollout status deployment/boardly-frontend --timeout=120s
                """
            }
        }

        stage('Smoke Test') {
            when { branch 'main' }
            steps {
                sh '''
                    kubectl -n ${KUBE_NAMESPACE} run smoke-test --rm -i --restart=Never --image=curlimages/curl -- \
                        curl --fail --silent http://boardly-backend:8080/api/health
                '''
            }
        }
    }

    post {
        always {
            sh 'docker rm -f ${TEST_DB_CONTAINER} 2>/dev/null || true'
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
