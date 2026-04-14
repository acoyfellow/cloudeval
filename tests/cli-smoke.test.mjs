import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

test('CLI help works', () => {
  const result = spawnSync('node', [resolve('bin/cloudeval.mjs'), 'help'], {
    cwd: resolve('.'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /CloudEval/);
  assert.match(result.stdout, /explain/);
});
