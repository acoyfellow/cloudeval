import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeModelName, slugifyModelName } from '../src/utils/model-name.mjs';

test('normalizeModelName strips workers-ai prefixes', () => {
  assert.equal(normalizeModelName('workers-ai/@cf/zai-org/glm-4.7-flash'), '@cf/zai-org/glm-4.7-flash');
  assert.equal(normalizeModelName('workers-ai:@cf/zai-org/glm-4.7-flash'), '@cf/zai-org/glm-4.7-flash');
  assert.equal(normalizeModelName('@cf/meta/llama-3.3-70b-instruct-fp8-fast'), '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
});

test('slugifyModelName creates stable ids', () => {
  assert.equal(slugifyModelName('workers-ai/@cf/zai-org/glm-4.7-flash'), 'zai-org-glm-4-7-flash');
  assert.equal(slugifyModelName('@cf/meta/llama-3.3-70b-instruct-fp8-fast'), 'meta-llama-3-3-70b-instruct-fp8-fast');
});
