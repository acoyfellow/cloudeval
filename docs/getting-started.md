# Getting started

CloudEval is a small Node 22 CLI. The repo works out of the box in mock mode, and it can talk to Workers AI / Braintrust once the env vars are set.

## Prerequisites

- Node.js 22 or newer
- `npm`
- Optional: Cloudflare and Braintrust credentials for real runs

## Install

```bash
git clone https://github.com/acoyfellow/cloudeval.git
cd cloudeval
npm install
```

If you use `nvm`, the quick path is:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm install
```

## Configure

```bash
cp .env.example .env
```

Fill in the values you need:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `BRAINTRUST_API_KEY`

Then confirm the setup:

```bash
node ./bin/cloudeval.mjs doctor
```

If you are already logged into Cloudflare via Wrangler, you can also export a valid API token from that session:

```bash
export CLOUDFLARE_API_TOKEN="$(npx wrangler auth token | tail -n 1)"
```

## Run a mock eval

Mock mode does not call external APIs, so it is the fastest way to validate the repo and produce sample artifacts:

```bash
node ./bin/cloudeval.mjs run \
  --dataset agent-quality \
  --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline \
  --mock
```

## Run a real eval

Once the env vars are present, drop `--mock` and keep the same command:

```bash
node ./bin/cloudeval.mjs run \
  --dataset agent-quality \
  --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline
```

## Optional Braintrust flow

```bash
node ./bin/cloudeval.mjs run \
  --dataset agent-quality \
  --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline \
  --braintrust
```

That writes generated Braintrust scripts and a shareable summary under `.cloudeval/braintrust/`.
