FROM python:3.8

ENV PYTHONPATH /bitchan
ENV PYTHONUNBUFFERED 1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /bitchan

ADD requirements.txt /
RUN pip install -r /requirements.txt \
    && rm -rf /requirements.txt

ADD . /bitchan
