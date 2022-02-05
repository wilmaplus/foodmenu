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
    ghostscript \
    qpdf \
    chromium-chromedriver \
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


COPY package.json .
RUN wget https://github.com/wilmaplus/foodmenu/releases/latest/download/dist.tar.gz
RUN tar -xf dist.tar.gz
RUN rm dist.tar.gz
USER chrome
RUN npm install

# Enable disk cache to speed up page load times, and disables miscellanous shit not necessary for chome
# Docker in itself is a sandbox, so can't care less about chromium sandbox. Chrome won't be handling any personal data anyways.
ENV SELENIUM_ARGS="disk-cache-dir=/tmp/seleniumcache,disable-translate,disable-sync,no-first-run,safebrowsing-disable-auto-update,disable-background-networking,no-sandbox,disable-setuid-sandbox"
CMD [ "node", "main.js" ]