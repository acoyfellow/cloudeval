import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeModelName, slugifyModelName } from '../src/utils/model-name.mjs';

test('normalizeModelName strips workers-ai prefixes', () => {
  assert.equal(normalizeModelName('workers-ai/@cf/zai-org/glm-5.1'), '@cf/zai-org/glm-5.1');
  assert.equal(normalizeModelName('workers-ai:@cf/zai-org/glm-5.1'), '@cf/zai-org/glm-5.1');
  assert.equal(normalizeModelName('@cf/meta/llama-3.3-70b-instruct-fp8-fast'), '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
});

test('slugifyModelName creates stable ids', () => {
  assert.equal(slugifyModelName('workers-ai/@cf/zai-org/glm-5.1'), 'zai-org-glm-5-1');
  assert.equal(slugifyModelName('@cf/meta/llama-3.3-70b-instruct-fp8-fast'), 'meta-llama-3-3-70b-instruct-fp8-fast');
});
