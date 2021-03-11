FROM node:slim

WORKDIR /bitchan
ENV PATH /bitchan/node_modules/.bin:$PATH

RUN apt-get update && apt-get install -y \
    git \
 && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN yarn install

COPY . .
CMD ["yarn", "start"]
