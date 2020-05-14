.PHONY: compile test

compile:
	docker-compose run --rm solc -o /sources/output --abi --bin /sources/Bitchan.sol

migrate:
	truffle create migration deploy_user
	truffle migrate

build_test:
	docker-compose build node

test: build_test
	docker-compose run --rm node remix-tests /sources/tests/user_test.sol
