FROM gr4per/node-react-base
MAINTAINER kwierchris
COPY package.json /var/tmp/base

# Change owner since COPY/ADD assignes UID/GID 0 to all copied content.
RUN apk add curl git --no-cache

# Make sure node can load modules from /var/tmp/base/node_modules
# Setting NODE_ENV is necessary for "npm install" below.
ENV NODE_ENV=development NODE_PATH=/var/tmp/base/node_modules PATH=${PATH}:${NODE_PATH}/.bin
RUN npm set progress=false ; npm install ; npm cache clean

WORKDIR /home/node/web-init
COPY . /home/node/web-init

CMD [ "npm", "start" ]
