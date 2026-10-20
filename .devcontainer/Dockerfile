FROM node:26-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# node_modules lives in a named volume (Linux binaries, separate from the Mac's).
# Creating it here makes the volume owned by the node user.
RUN mkdir -p /workspace/node_modules /workspace/apps/api/dist /workspace/apps/api/data /workspace/apps/web/.next \
  && chown -R node:node /workspace

USER node
WORKDIR /workspace
