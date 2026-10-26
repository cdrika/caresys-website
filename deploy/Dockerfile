FROM node:22-alpine
WORKDIR /website
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node public ./public
RUN mkdir -p var && chown node:node var
USER node
ENV HOST=0.0.0.0 PORT=8090
EXPOSE 8090
CMD ["node","server.mjs"]
