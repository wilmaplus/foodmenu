FROM arm64v8/node:16-alpine3.14

RUN wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub
RUN wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.33-r0/glibc-2.33-r0.apk
RUN apk add glibc-2.33-r0.apk

RUN apk add --no-cache python3 && \
    python3 -m ensurepip && \
    rm -r /usr/lib/python*/ensurepip && \
    pip3 install --upgrade pip setuptools && \
    if [ ! -e /usr/bin/pip ]; then ln -s pip3 /usr/bin/pip ; fi && \
    rm -r /root/.cache

RUN apk add --update alpine-sdk

WORKDIR /usr/src/app

COPY package.json .
RUN wget https://github.com/wilmaplus/foodmenu/releases/latest/download/dist.tar.gz
RUN tar -xf dist.tar.gz
RUN rm dist.tar.gz
RUN npm install

EXPOSE 3001
CMD [ "node", "main.js" ]