import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeBraintrustEval } from '../src/braintrust/generate.mjs';

test('writeBraintrustEval emits a runnable Braintrust source file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cloudeval-'));
  try {
    const file = await writeBraintrustEval({
      cwd: dir,
      datasetPath: 'src/datasets/agent-quality.mjs',
      datasetName: 'agent-quality',
      systemPrompt: 'hello',
      taskModel: 'workers-ai/@cf/zai-org/glm-4.7-flash',
      judgeModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      experimentName: 'agent-quality-zai-org-glm-4-7-flash',
    });

    const source = await readFile(file, 'utf8');
    assert.match(source, /import \{ Eval \} from "braintrust";/);
    assert.match(source, /agent-quality-zai-org-glm-4-7-flash/);
    assert.match(source, /workers-ai\/\@cf\/zai-org\/glm-4\.7-flash/);
    assert.match(source, /dataset\.rows\.map/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
