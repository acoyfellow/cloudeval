# Mock run example

This is the fastest way to verify the repo and generate shareable artifacts without Workers AI credentials.

## Command

```bash
node ./bin/cloudeval.mjs run \
  --dataset agent-quality \
  --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline \
  --mock
```

## What you should see

- a short markdown summary in the terminal
- a `.cloudeval/runs/...` directory
- a `report.html` file you can open in a browser
- a `report.md` file you can paste into a PR

## Why mock mode is useful

- it exercises the dataset loader
- it validates the report pipeline
- it gives you a stable baseline for CLI and docs changes
