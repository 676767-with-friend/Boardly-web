
# Standalone API test

`AdminOperationsApiTests.java` is outside `backend/src/test/java`, so Maven and CI do not run it. Its scenarios overlap the active management API suites, but their exact coverage has not been fully reconciled. Keep this file for coverage review; do not count it as a passing test. Supported deployment manifests are in `k8s/`.
