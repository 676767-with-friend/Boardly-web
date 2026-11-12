const requiredJobs = [
  'Frontend (build + Vitest)',
  'Backend (mvn verify)',
  'E2E (Cypress)',
];

function checkCiRun(run, jobs, repositoryId) {
  if (!run || run.repository?.id !== repositoryId || run.head_repository?.id !== repositoryId) {
    return 'CI run did not originate from this repository';
  }
  if (run.path !== '.github/workflows/ci.yml' || run.event !== 'push' || run.head_branch !== 'main') {
    return 'Only push-triggered main CI is eligible for release';
  }
  if (run.status !== 'completed' || run.conclusion !== 'success' || !/^[0-9a-f]{40}$/.test(run.head_sha)) {
    return 'CI did not complete successfully for a valid commit';
  }
  const missing = requiredJobs.filter(name => !jobs.some(job => job.name === name && job.status === 'completed' && job.conclusion === 'success'));
  return missing.length ? `Required CI jobs did not pass: ${missing.join(', ')}` : null;
}

module.exports = { checkCiRun };
