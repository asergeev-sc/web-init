FROM gr4per/node-react-base

MAINTAINER kwierchris
ENV NODE_ENV=development

WORKDIR /home/node/web-init

#Install app dependencies
ADD . /home/node/web-init

RUN npm set progress=false && npm install ; npm cache clean

CMD [ "npm", "test" ]
