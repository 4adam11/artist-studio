#!/bin/sh
# Starts the store on Mac or Linux:  sh start.sh
#
# Uses your Node.js if it is version 20 or newer. Otherwise it downloads the
# official Node.js from nodejs.org into the .runtime folder (one time only;
# nothing is installed on your system).
set -e
cd "$(dirname "$0")"

NODE_VERSION=24.22.3
NODE=""

if [ -z "$STORE_PORTABLE_NODE" ] && command -v node >/dev/null 2>&1; then
  major=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')
  if [ "${major:-0}" -ge 20 ] 2>/dev/null; then NODE=node; fi
fi

if [ -z "$NODE" ]; then
  case "$(uname -s)" in
    Darwin) os=darwin ;;
    Linux) os=linux ;;
    *) echo "Please install Node.js 20 or newer from https://nodejs.org and run this again."; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64) arch=x64 ;;
    arm64|aarch64) arch=arm64 ;;
    *) echo "Please install Node.js 20 or newer from https://nodejs.org and run this again."; exit 1 ;;
  esac
  name="node-v$NODE_VERSION-$os-$arch"
  NODE=".runtime/$name/bin/node"
  if [ ! -x "$NODE" ]; then
    echo "Downloading Node.js $NODE_VERSION from nodejs.org (one time, about 30 MB)..."
    mkdir -p .runtime
    curl -fL --progress-bar -o ".runtime/$name.tar.gz" "https://nodejs.org/dist/v$NODE_VERSION/$name.tar.gz"
    tar -xzf ".runtime/$name.tar.gz" -C .runtime
    rm -f ".runtime/$name.tar.gz"
  fi
fi

exec "$NODE" app/start.mjs
