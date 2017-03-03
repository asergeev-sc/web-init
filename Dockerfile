FROM gr4per/node-react-base
MAINTAINER kwierchris

# NOTE: "node" user and corresponding "/home/node" dir are created by "node:6-alpine" image.
WORKDIR /var/tmp/base

COPY package.json .

# Make sure node can load modules from /var/tmp/base/node_modules
# Setting NODE_ENV is necessary for "npm install" below.
ENV NODE_ENV=development NODE_PATH=/var/tmp/base/node_modules PATH=${PATH}:${NODE_PATH}/.bin
RUN npm set progress=false && npm install ; npm cache clean

WORKDIR /home/node/web-init

# Bundle app source by overwriting all WORKDIR content.
COPY . tmp

# Change owner since COPY/ADD assignes UID/GID 0 to all copied content.
RUN apk add rsync curl --no-cache && rsync -a tmp/* ./ ; rm -rf tmp

CMD [ "npm", "start" ]
