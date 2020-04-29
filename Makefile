.PHONY: build up down migrate


build:
	docker-compose build

up: build
	docker-compose up django

down:
	docker-compose down --remove-orphans

migrate: build
	docker-compose run --rm python ./scripts/make_and_migrate

seed_db:
	docker-compose run --rm python ./scripts/seed_database

fresh:
	docker-compose down -v
	docker-compose up -d postgres
	docker-compose run --rm python ./manage.py reset_db --noinput
	docker-compose run --rm python ./scripts/make_and_migrate
	docker-compose run --rm python ./scripts/seed_database
