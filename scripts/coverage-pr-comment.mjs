import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const summaryPath = 'coverage/coverage-summary.json';
const outputPath = 'coverage/pr-comment.md';

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const total = summary.total;

const pct = total.lines.pct;
const missed = Math.max(0, Math.round((100 - pct) * 100) / 100);
const covered = Math.round(pct * 100) / 100;

const rows = [
  ['Lines', total.lines],
  ['Statements', total.statements],
  ['Functions', total.functions],
  ['Branches', total.branches],
]
  .map(
    ([label, metric]) =>
      `| ${label} | ${metric.pct}% | ${metric.covered} | ${metric.total} |`,
  )
  .join('\n');

const comment = `<!-- fvl-coverage-report -->
## Test Coverage

\`\`\`mermaid
pie showData
  "Covered" : ${covered}
  "Missed" : ${missed}
\`\`\`

| Metric | Coverage | Covered | Total |
| --- | ---: | ---: | ---: |
${rows}
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, comment);
