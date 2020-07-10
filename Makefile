.PHONY: build up down migrate


build:
	docker-compose build

build_client:
	docker-compose build react

build_truffle:
	docker-compose build truffle

up: build_client
	docker-compose up react truffle ganache

up-prod: build_client
	docker-compose up react-prod truffle ganache

down:
	docker-compose down --remove-orphans

clean: down
	docker-compose rm

compile:
	docker-compose run --rm truffle truffle compile

test_contracts: build_truffle
	docker-compose run --rm truffle truffle test --stacktrace

test_client: build_client
	docker-compose run --rm react npm test test -- --watchAll=false

migrate-new: build_truffle
	docker-compose run --rm truffle truffle create migration deploy_user

migrate: build_truffle
	docker-compose run --rm truffle truffle migrate

migrate-reset: build_truffle
	docker-compose run --rm truffle truffle migrate --reset

deploy: build_truffle
	docker-compose run --rm truffle truffle deploy

deploy_ropsten: build_truffle
	docker-compose run --rm truffle truffle deploy --network ropsten
