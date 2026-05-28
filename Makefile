# bitchan task runner.  Run `make` (or `make help`) to list targets.
.DEFAULT_GOAL := help
.PHONY: help seed-sepolia seed-local

help: ## List available targets
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

seed-sepolia: ## Post demo content (text, youtube, image, reply) to live Sepolia + Convex
	@cd web && BITCHAN_ADDRESS="$$(bunx convex env get BITCHAN_ADDRESS 2>/dev/null)" \
		bun scripts/seed-sepolia.mjs

seed-local: ## Post demo content to a local Anvil chain (see scripts/seed.sh)
	@bash scripts/seed.sh
