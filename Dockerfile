# see: https://docs.docker.com/go/dockerfile-reference
FROM denoland/deno:alpine-2.2.10
# the default port for deno serve
# see: https://docs.deno.com/runtime/reference/cli/serve
EXPOSE 8000
# prefer a non-root user for security
USER deno

WORKDIR /engine

# cache all dependencies as a layer
# currently there is no good way to cache only entrypoint dependencies
# see: https://github.com/denoland/deno_docker/issues/435
COPY deno.* .
RUN deno install

# cache entrypoint to defer compilation on every startup
# (this layer is re-run when files change)
COPY . .
RUN deno cache server.ts

CMD ["run", "--allow-env", "--allow-net", "server.ts"]
