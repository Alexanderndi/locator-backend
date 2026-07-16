import { execSync } from 'node:child_process';

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const branch = process.env.PROTECTED_BRANCH || 'main';
const requiredCheck = process.env.REQUIRED_STATUS_CHECK || 'Lint, test, and build';

if (!token) {
  throw new Error(
    'GITHUB_TOKEN or GH_TOKEN is required. Use a token with Administration: write permission for this repository.',
  );
}

const remoteUrl = execSync('git config --get remote.origin.url', {
  encoding: 'utf8',
}).trim();

const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
if (!match) {
  throw new Error(`Could not parse GitHub owner/repo from remote: ${remoteUrl}`);
}

const [, owner, repo] = match;
const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`;

const body = {
  required_status_checks: {
    strict: true,
    contexts: [requiredCheck],
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 1,
    require_last_push_approval: true,
  },
  restrictions: null,
  required_linear_history: true,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
  lock_branch: false,
  allow_fork_syncing: true,
};

const response = await fetch(url, {
  method: 'PUT',
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2026-03-10',
  },
  body: JSON.stringify(body),
});

if (!response.ok) {
  const details = await response.text();
  throw new Error(
    `Failed to protect ${owner}/${repo}:${branch}. GitHub returned ${response.status}: ${details}`,
  );
}

console.log(
  `Protected ${owner}/${repo}:${branch}. Pull requests and passing "${requiredCheck}" checks are now required before merge.`,
);
