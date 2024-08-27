import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env.SCHEMA || './schema.gql',
  overwrite: true,
  generates: {
    // Dart
    './clients/flutter/lib/src/models.generated.dart': {
      plugins: ['./plugins/dart-models.js'],
    },
    './clients/flutter/lib/src/operations.generated.dart': {
      plugins: ['./plugins/dart-operations.js'],
    },
    // React
    './clients/react/src/types.generated.ts': {
      plugins: ['./plugins/typescript-models.js'],
    },
    './clients/react/src/operations.generated.ts': {
      plugins: ['./plugins/typescript-operations.js'],
    },
    './clients/react/src/hooks.generated.ts': {
      plugins: ['./plugins/react-hooks.js'],
    },
    // Vue
    './clients/vue/src/types.generated.ts': {
      plugins: ['./plugins/typescript-models.js'],
    },
    './clients/vue/src/operations.generated.ts': {
      plugins: ['./plugins/typescript-operations.js'],
    },
    './clients/vue/src/composables.generated.ts': {
      plugins: ['./plugins/vue-composables.js'],
    },
  },
};

export default config;
