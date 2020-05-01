.PHONY: compile test

compile:
	docker-compose run --rm solc -o /sources/output --abi --bin /sources/Bitchan.sol

test:
	docker-compose run --rm node remix-tests /sources/tests/Bitchan_test.sol
