import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config/load.mjs';

test('loadConfig falls back to cloudflare preset when config file is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cloudeval-'));
  try {
    const config = await loadConfig(dir);
    assert.equal(config.project, 'CloudEval');
    assert.equal(config.defaultProvider, 'workers-ai');
    assert.equal(config.models.baseline, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
