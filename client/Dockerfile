FROM node:alpine as build
WORKDIR /bitchan
ENV PATH /bitchan/node_modules/.bin:$PATH
COPY package*.json ./
RUN apk add --no-cache git
RUN npm install --global
COPY . .
CMD ["npm", "start"]
