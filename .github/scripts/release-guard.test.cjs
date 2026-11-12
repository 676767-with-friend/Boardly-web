const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { checkCiRun } = require('./release-guard.cjs');

const sha = 'a'.repeat(40);
const run = {
  repository: { id: 1 }, head_repository: { id: 1 },
  path: '.github/workflows/ci.yml', event: 'push', head_branch: 'main',
  status: 'completed', conclusion: 'success', head_sha: sha,
};
const jobs = ['Frontend (build + Vitest)', 'Backend (mvn verify)', 'E2E (Cypress)']
  .map(name => ({ name, status: 'completed', conclusion: 'success' }));

test('only successful main push CI with every required job is eligible', () => {
  assert.equal(checkCiRun(run, jobs, 1), null);
  for (const change of [
    { event: 'pull_request' }, { head_branch: 'feature' },
    { status: 'in_progress' }, { conclusion: 'failure' }, { conclusion: 'cancelled' },
    { head_repository: { id: 2 } }, { repository: { id: 2 } },
  ]) {
    assert.ok(checkCiRun({ ...run, ...change }, jobs, 1));
  }
  assert.match(checkCiRun(run, jobs.slice(0, 2), 1), /E2E/);
  assert.match(checkCiRun(run, [{ ...jobs[0], conclusion: 'failure' }, ...jobs.slice(1)], 1), /Frontend/);
  assert.match(checkCiRun(run, [{ ...jobs[0], status: 'in_progress' }, ...jobs.slice(1)], 1), /Frontend/);
});

const workflow = readFileSync(join(__dirname, '../workflows/release.yml'), 'utf8');
const scriptLines = workflow.split(/\r?\n/);
const scriptStart = scriptLines.findIndex(line => line.trim() === 'script: |');
assert.ok(scriptStart >= 0);
const lines = [];
for (const line of scriptLines.slice(scriptStart + 1)) {
  if (!line.startsWith('            ')) break;
  lines.push(line.slice(12));
}
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runGateScript = new AsyncFunction('github', 'context', 'core', 'require', 'process', lines.join('\n'));

async function gate(eventName, candidate, mainSha = sha, selectedSha = sha, ref = 'refs/heads/main') {
  const result = { outputs: {}, failure: null, summary: [] };
  const core = {
    setFailed: message => { result.failure = message; },
    setOutput: (name, value) => { result.outputs[name] = value; },
    info: () => {},
    summary: {
      addRaw(message) { result.summary.push(message); return this; },
      async write() {},
    },
  };
  const github = {
    rest: {
      actions: {
        async listWorkflowRuns() { return { data: { workflow_runs: [candidate] } }; },
        listJobsForWorkflowRun: () => {},
      },
      repos: { async getBranch() { return { data: { commit: { sha: mainSha } } }; } },
    },
    async paginate() { return jobs; },
  };
  const context = {
    eventName, ref, sha: selectedSha,
    repo: { owner: 'owner', repo: 'boardly' },
    payload: { repository: { id: 1 }, workflow_run: candidate },
  };
  await runGateScript(github, context, core, () => ({ checkCiRun }), {
    env: { MINIKUBE_RUNNER_LABEL: 'verified-local-runner' },
  });
  return result;
}

test('automatic release uses the tested commit and skips a superseded one', async () => {
  const candidate = { ...run, id: 1, html_url: 'https://example.test/ci', created_at: '2026-11-12T00:00:00Z' };
  assert.equal((await gate('workflow_run', candidate)).outputs.sha, sha);
  const skipped = await gate('workflow_run', candidate, 'b'.repeat(40));
  assert.equal(skipped.outputs.eligible, undefined);
  assert.match(skipped.summary[0], /Skipped superseded release/);
});

test('manual retry requires main and successful CI for the exact selected SHA', async () => {
  const candidate = { ...run, id: 1, html_url: 'https://example.test/ci', created_at: '2026-11-12T00:00:00Z' };
  assert.equal((await gate('workflow_dispatch', candidate)).outputs.sha, sha);
  assert.match((await gate('workflow_dispatch', candidate, sha, sha, 'refs/heads/feature')).failure, /main/);
  assert.match((await gate('workflow_dispatch', candidate, sha, 'b'.repeat(40))).failure, /No push-triggered/);
});
