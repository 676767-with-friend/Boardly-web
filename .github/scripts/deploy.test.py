"""Exercise deployment ordering and failure propagation without a cluster."""
import os
from pathlib import Path
import subprocess
import tempfile

script = str(Path(__file__).with_name("deploy.sh").resolve())
sha = "a" * 40
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    stub = root / "stub"
    stub.write_text("#!/usr/bin/env python3\nimport os, sys\nfrom pathlib import Path\nname = Path(sys.argv[0]).name\nargs = sys.argv[1:]\nwith open(os.environ['CALL_LOG'], 'a') as log:\n    log.write(name + ' ' + ' '.join(args) + '\\n')\nif name == 'git': print(os.environ['IMAGE_TAG'])\nif name == 'kubectl':\n    if args[0] != 'kustomize':\n        assert args[:4] == ['--context', 'boardly-dev', '-n', 'boardly']\n    if 'kustomize' in args: print('image: boardly-backend:local\\nimage: boardly-frontend:local')\n    if 'get' in args and 'deployment' in args:\n        app = args[args.index('deployment') + 1]\n        print(app + ':' + os.environ['IMAGE_TAG'])\n    if 'apply' in args and args[-1] == '-': sys.stdin.read()\n    if 'apply' in args and args[-1].endswith('release.yaml'):\n        content = Path(args[-1]).read_text()\n        assert ':local' not in content\n        assert os.environ['IMAGE_TAG'] in content\nif os.environ.get('FAIL_ON') and os.environ['FAIL_ON'] in ' '.join(args): sys.exit(1)\n")
    stub.chmod(0o755)
    for name in ("git", "kubectl", "minikube", "docker"):
        (root / name).symlink_to(stub)
    log = root / "calls"
    env = {**os.environ, "PATH": directory + ":" + os.environ["PATH"],
           "IMAGE_TAG": sha, "CALL_LOG": str(log)}
    def run(mode, failure=""):
        log.write_text("")
        result = subprocess.run(["bash", script, mode], env={**env, "FAIL_ON": failure},
                                capture_output=True, text=True)
        return result.returncode, log.read_text()
    code, calls = run("build")
    assert code == 0, calls
    assert calls.count("docker build") == 2
    assert "minikube -p boardly-dev image load boardly-backend:" + sha in calls
    assert "apply" not in calls
    code, calls = run("deploy")
    assert code == 0, calls
    assert calls.index("rollout status deployment/boardly-db") < calls.index("apply -f k8s/15-db-migrate.yaml")
    assert calls.index("--for=condition=complete") < calls.index("release.yaml")
    assert "delete job boardly-db-migrate" in calls
    assert "secret generic" not in calls and "delete pvc" not in calls
    for mode, failure in (("build", "build"), ("deploy", "--for=condition=complete"),
                          ("deploy", "rollout status deployment/boardly-backend"),
                          ("deploy", "exec deployment/boardly-frontend")):
        code, calls = run(mode, failure)
        assert code != 0, (mode, failure)
        if "complete" in failure: assert "release.yaml" not in calls
    env["IMAGE_TAG"] = "invalid"
    assert run("deploy")[0] != 0
print("Local release tests passed (mock commands; no cluster deployment).")
