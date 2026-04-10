---
name: cloudflare-pages-deployment-checker
description: Verify that LawSignal is correctly wired for Cloudflare Pages and Pages Functions without making unnecessary code changes.
---

# When to Use

- Pre-deploy or post-failure Cloudflare Pages checks
- Local build works but Pages preview or production breaks
- Need to validate Pages Functions, D1 bindings, or deploy assumptions

# Inputs

- `package.json`
- `vite.config.js`
- `wrangler.toml`
- `functions/api/[[route]].js`
- Cloudflare Pages build/deploy settings if available
- Deployment error output if available

# Workflow

## 1. Inspect runtime shape

- Confirm SPA build output and deploy command
- Confirm whether server behavior lives in Pages Functions only
- Identify D1 and env usage points

## 2. Check build assumptions

- Verify install/build commands are coherent
- Confirm output directory matches deploy assumptions
- Check for Node or bundler assumptions that differ between local and Pages

## 3. Check Pages Function boundaries

- Review runtime-safe APIs and imports
- Check request routing assumptions
- Check for browser/server boundary mistakes

## 4. Check env and binding wiring

- Compare env vars and binding names used in code against expected Cloudflare config
- Confirm D1 binding is `DB` where required
- Flag missing or mis-scoped values

## 5. Recommend the smallest fix

- Prefer config or command corrections first
- Keep changes localized
- Avoid refactoring working app code unless config is not the issue

## 6. Define verification

- Run `npm run build`
- If backend changed, smoke-test the relevant route shape
- Reconfirm deploy command and Cloudflare binding assumptions

# Guardrails

- Do not invent secrets or dashboard values
- Do not rewrite the app for deploy issues
- Prefer explicit, deploy-oriented checks over generic platform advice
