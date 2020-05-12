.PHONY: build up down migrate


build:
	docker-compose build

up: build
	docker-compose up bitchan-dev

down:
	docker-compose down --remove-orphans

clean: down
	docker-compose rm
