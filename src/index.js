const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
  const { eventName, sha, ref, repo: { owner, repo }, payload } = github.context;
  let branch = ref.slice(11);
  let headSha = sha;
  if (payload.pull_request) {
    branch = payload.pull_request.head.ref;
    headSha = payload.pull_request.head.sha;
  }

  console.log({ eventName, sha, headSha, branch, owner, repo });
  const workflow_id = core.getInput('workflow_id', { required: true });
  const token = core.getInput('access_token', { required: true });
  console.log(`Found input: ${workflow_id}`);
  console.log(`Found token: ${token ? 'yes' : 'no'}`);
  const octokit = new github.GitHub(token);
  const { data } = await octokit.actions.listWorkflowRuns({ owner, repo, workflow_id, branch });
  console.log(`Found ${data.total_count} runs total.`);
  const runningWorkflows = data.workflow_runs.filter(
    workflow => workflow.head_sha !== headSha && workflow.status !== 'completed'
  );
  console.log(`Found ${runningWorkflows.length} runs in progress.`);
  for (const { id, head_sha, status } of runningWorkflows) {
    console.log('Cancelling another run: ', { id, head_sha, status });
    const res = await octokit.actions.cancelWorkflowRun({ owner, repo, run_id: id });
    console.log(`Status ${res.status}`);
  }
  console.log('Done.');
}

main()
  .then(() => core.info('Cancel Complete.'))
  .catch(e => core.setFailed(e.message));