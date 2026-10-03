#!/bin/sh
set -e

# sshd needs root; the image gives coder NOPASSWD sudo for exactly this.
sudo mkdir -p /run/sshd
sudo ssh-keygen -A

# The API writes one fresh public key here per "Connect to IDE" request
# and truncates it when the workspace stops.
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
touch "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"

sudo /usr/sbin/sshd

# Hand off to the stock entrypoint: fixuid → entrypoint.d → code-server.
exec /usr/bin/entrypoint.sh --bind-addr 0.0.0.0:8080 .
