ARG BASE_IMAGE
FROM ${BASE_IMAGE}

RUN addgroup -g 65532 -S evaluator \
  && adduser -u 65532 -S -D -H -G evaluator evaluator

USER 65532:65532
WORKDIR /workspace
