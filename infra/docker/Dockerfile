# CloudIDE workspace image — code-server + OpenSSH server.
#
# Provides the "Connect from VS Code / Cursor / Antigravity / JetBrains"
# flow (ARCHITECTURE.md §13.2): the container is the source of truth and
# the user's own IDE connects over SSH Remote.
#
# Build once:
#   docker build -f infra/docker/Dockerfile -t cloudide-workspace:latest .
#
FROM ghcr.io/coder/code-server:latest

USER root

# The stock image ships openssh-client only; the server is what we need.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssh-server \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /run/sshd

# COPY paths are relative to the build context (the repo root), not to this
# Dockerfile — hence the infra/docker/ prefix.
COPY infra/docker/sshd_config /etc/ssh/sshd_config
COPY infra/docker/entrypoint.sh /usr/local/bin/cloudide-entrypoint.sh
RUN chmod +x /usr/local/bin/cloudide-entrypoint.sh

USER coder

# Replaces the stock entrypoint: start sshd first, then hand off to the
# original one (fixuid → entrypoint.d scripts → code-server).
ENTRYPOINT ["/usr/local/bin/cloudide-entrypoint.sh"]
