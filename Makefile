# Brand Forge — common dev tasks.
# Run `make` or `make help` to see what's here.

.DEFAULT_GOAL := help
.PHONY: help dev n8n web import db typecheck lint check clean smoke docker seed validate teardown

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Start n8n (5678) and the web app (3000) together. Ctrl-C kills both.
	@echo "→ starting n8n on :5678 and web on :3000"
	@trap 'kill 0' INT TERM EXIT; \
	  ( n8n start ) & \
	  ( cd web && bun dev ) & \
	  wait

n8n: ## Start just n8n.
	n8n start

web: ## Start just the Next.js dev server.
	cd web && bun dev

import: ## Re-import the workflow JSON into n8n.
	n8n import:workflow --input=workflow/brand-api.json

db: ## Apply db/schema.sql to $$DATABASE_URL.
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	psql "$$DATABASE_URL" -f db/schema.sql

typecheck: ## Run TypeScript on the web app.
	cd web && bun run typecheck

lint: ## Run biome lint on the web app.
	cd web && bun run lint

validate: ## Sanity-check workflow/brand-api.json structure.
	python3 scripts/validate-workflow.py

check: typecheck lint validate ## Run all checks (typecheck + lint + validate).

smoke: ## Hit every n8n webhook and report pass/fail.
	bash scripts/smoke.sh

seed: ## Seed 3 sample brand runs (stripe/vercel/linear) by hitting webhooks.
	bash scripts/seed-history.sh

clean: ## Remove node_modules, .next, and tsbuildinfo.
	rm -rf web/node_modules web/.next web/tsconfig.tsbuildinfo web/next-env.d.ts

docker: ## Start n8n + web in Docker (n8n on :5678, web on :3000).
	docker compose up --build

teardown: ## Nuke node_modules / .next / n8n_data. Prompts unless --yes.
	bash scripts/teardown.sh
