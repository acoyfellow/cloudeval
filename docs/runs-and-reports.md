# Runs and reports

CloudEval writes portable artifacts so the command line, the HTML report, and the markdown summary all describe the same run.

## Default output layout

```text
.cloudeval/runs/<run-id>-<dataset>-<models>/
  run.json
  report.html
  report.md
  summary.txt
  meta.json
```

### What each file is for

- `run.json` — canonical machine-readable result, including metadata
- `report.html` — shareable browser report
- `report.md` — markdown version for docs, PRs, or chat tools
- `summary.txt` — compact one-line-per-model summary
- `meta.json` — timestamps, git commit, Node version, and runtime details

## Command helpers

- `cloudeval report --results <file>` — render a JSON result as markdown
- `cloudeval explain --results <file>` — summarize the result in plain English
- `cloudeval compare --a <file> --b <file>` — compare two result files

## Practical workflow

1. run a mock eval to verify the dataset and report format
2. inspect `report.html` for the visual summary
3. use `report.md` or `explain` when sharing the run in chat
4. use `compare` when you want to look at the same models across two runs

## Tip

If you only want a JSON artifact, use `--out <file>.json`:

```bash
node ./bin/cloudeval.mjs run \
  --dataset chat-response \
  --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline \
  --mock \
  --out ./results/chat-response.json
```
