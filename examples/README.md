# Examples

A few lightweight examples for common CloudEval workflows.

## Mock eval

Run a local eval without external API calls:

```bash
node ./bin/cloudeval.mjs run \
  --dataset agent-quality \
  --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline \
  --mock
```

Expected artifacts:

- `.cloudeval/runs/.../run.json`
- `.cloudeval/runs/.../report.html`
- `.cloudeval/runs/.../report.md`
- `.cloudeval/runs/.../summary.txt`

## Read the result

```bash
node ./bin/cloudeval.mjs report --results ./results/agent-quality.json
node ./bin/cloudeval.mjs explain --results ./results/agent-quality.json
```

## Compare two runs

```bash
node ./bin/cloudeval.mjs compare --a ./results/run-a.json --b ./results/run-b.json
```
