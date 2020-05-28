FROM node:slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
    && rm -rf /var/lib/apt/lists/*

# set working directory
WORKDIR /bitchan

# add `/app/node_modules/.bin` to $PATH
ENV PATH /bitchan/node_modules/.bin:$PATH

# install app dependencies
COPY package*.json ./
RUN npm install --global --save

COPY . .

# start app
CMD ["npm", "start"]
