# Security Policy

## Reporting a vulnerability

If you find a security issue, please avoid public disclosure until it is reviewed.
Open a private security report in GitHub or contact the maintainer directly.

## Secrets

- never commit `.env`
- use `.env.example` as the template
- rotate any leaked tokens immediately

## Scope

CloudEval may interact with:
- Cloudflare Workers AI credentials
- Braintrust API keys

Treat those as sensitive production secrets.
