import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownReport } from '../src/report/markdown.mjs';
import { renderExplanation } from '../src/report/explain.mjs';

const sample = {
  runId: 'sample',
  dataset: 'agent-quality',
  models: ['workers-ai/@cf/zai-org/glm-5.1', 'baseline'],
  judgeModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  provider: 'workers-ai',
  modelRuns: [
    {
      model: 'workers-ai/@cf/zai-org/glm-5.1',
      summary: { avgScore: 0.86, passRate: 0.75, rows: 4, failures: 1 },
      rows: [
        { id: 'a', input: 'q1', score: 1, scorer: 'Correctness', output: 'ok' },
        { id: 'b', input: 'q2', score: 0.5, scorer: 'Correctness', output: 'meh' },
        { id: 'c', input: 'q3', score: 1, scorer: 'Correctness', output: 'ok' },
        { id: 'd', input: 'q4', score: 1, scorer: 'Correctness', output: 'ok' },
      ],
    },
    {
      model: 'baseline',
      summary: { avgScore: 0.74, passRate: 0.5, rows: 4, failures: 2 },
      rows: [
        { id: 'a', input: 'q1', score: 0.5, scorer: 'Correctness', output: 'bad' },
        { id: 'b', input: 'q2', score: 0.5, scorer: 'Correctness', output: 'meh' },
        { id: 'c', input: 'q3', score: 1, scorer: 'Correctness', output: 'ok' },
        { id: 'd', input: 'q4', score: 1, scorer: 'Correctness', output: 'ok' },
      ],
    },
  ],
};

test('renderMarkdownReport includes key summary sections', () => {
  const report = renderMarkdownReport(sample);
  assert.match(report, /# CloudEval report/);
  assert.match(report, /Best model in this run: \*\*workers-ai\/\@cf\/zai-org\/glm-5\.1\*\*/);
  assert.match(report, /Largest model spread by row/);
  assert.match(report, /Biggest misses/);
});

test('renderExplanation gives a plain-English summary', () => {
  const explanation = renderExplanation(sample);
  assert.match(explanation, /# CloudEval explanation/);
  assert.match(explanation, /Best overall model: \*\*workers-ai\/\@cf\/zai-org\/glm-5\.1\*\*/);
  assert.match(explanation, /What to do next/);
});
