# Contributing to CloudEval

Thanks for helping build CloudEval.

## Setup

```bash
cd cloudeval
cp .env.example .env
source ~/.nvm/nvm.sh && nvm use 22
node ./bin/cloudeval.mjs doctor
```

## Workflow

- keep changes small and focused
- update or add tests for behavior changes
- run `node --test` before submitting
- keep README examples working

## Adding a dataset

1. add a file under `src/datasets/`
2. export `{ name, rows }`
3. reference it from `evals.config.mjs`
4. add a test for any new report/explain behavior

## Adding a scorer

1. add rubric text to `src/scorers/registry.mjs`
2. wire it through the runner or Braintrust generator
3. add a report test if the new scorer changes output expectations

## Pull requests

- explain what changed and why
- include before/after output when relevant
- mention any API/CLI changes clearly
