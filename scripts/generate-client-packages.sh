#!/bin/sh
set -e

CLIENT_VERSION=$(node -p "require('./package.json').version")

echo "Starting to generate client packages v$CLIENT_VERSION ===="

echo "Generating pubspec.yaml with new version ===="
cat clients/flutter/pubspec.draft.yaml | sed "s/<version>/$CLIENT_VERSION/g" > clients/flutter/pubspec.yaml

echo "Generating package.json with new version ===="
cat clients/react/package.draft.json | sed "s/<version>/$CLIENT_VERSION/g" > clients/react/package.json
cat clients/vue/package.draft.json | sed "s/<version>/$CLIENT_VERSION/g" > clients/vue/package.json

echo "Building codegen plugins ===="
# Add plugins to build here
./node_modules/.bin/tsc \
  plugins/dart-models.ts \
  plugins/dart-operations.ts \
  plugins/typescript-models.ts \
  plugins/typescript-operations.ts \
  plugins/react-hooks.ts \
  plugins/vue-composables.ts \
  --esModuleInterop

echo "Generating client packages ===="
./node_modules/.bin/gql-gen --config ./config.ts

echo "Building react client package ===="
cd ./clients/react && yarn install && cd -

echo "Building vue client package ===="
cd ./clients/vue && yarn install && cd -
