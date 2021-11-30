FROM arm64v8/node:16-alpine3.14

# Installs latest Chromium package.
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" > /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/v3.12/main" >> /etc/apk/repositories \
    && apk upgrade -U -a \
    && apk add \
    libstdc++ \
    chromium \
    harfbuzz \
    nss \
    freetype \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei \
    chromium-chronedriver \
    && rm -rf /var/cache/* \
    && mkdir /var/cache/apk

COPY local.conf /etc/fonts/local.conf

# Add Chrome as a user
RUN mkdir -p /usr/src/app \
    && adduser -D chrome \
    && chown -R chrome:chrome /usr/src/app
# Run Chrome as non-privileged
USER chrome
WORKDIR /usr/src/app

ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

USER root
RUN apk add --no-cache tini make gcc g++ python3 git nodejs nodejs-npm yarn
USER chrome

USER root
RUN apk add --no-cache ca-certificates tzdata mailcap


ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser

COPY package.json .
RUN wget https://github.com/wilmaplus/foodmenu/releases/latest/download/dist.tar.gz
RUN tar -xf dist.tar.gz
RUN rm dist.tar.gz
USER chrome
RUN npm install

CMD [ "node", "main.js" ]