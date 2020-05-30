.PHONY: build up down migrate


build:
	docker-compose build

build_client:
	docker-compose build react

build_truffle:
	docker-compose build truffle

up: build
	docker-compose up react ganache

down:
	docker-compose down --remove-orphans

clean: down
	docker-compose rm

compile:
	#docker-compose run --rm solidity -o /sources/output --abi --bin /sources/Bitchan.sol
	docker-compose run --rm truffle truffle compile

test_contracts: build_truffle
	docker-compose run --rm truffle truffle test --stacktrace

test_client: build_react
	docker-compose run --rm truffle truffle test --stacktrace

migrate-new: build_truffle
	docker-compose run --rm truffle truffle create migration deploy_user

migrate: build_truffle
	docker-compose run --rm truffle truffle migrate

migrate-reset: build_truffle
	docker-compose run --rm truffle truffle migrate --reset

deploy: build_truffle
	docker-compose run --rm truffle truffle deploy
