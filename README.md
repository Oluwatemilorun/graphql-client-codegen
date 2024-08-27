# graphql-client-codegen
A tool for generating client libraries for Dart, React, Vue from a GraphQL schema

## Usage
```sh
# Install dependencies
yarn install

# Generate packages
SCHEMA=./path/to/schema.gql yarn generate
```

## Packages
### Dart/Flutter
Wraps around the dart HttpClient package


### TODO
- [ ] Accept schema path through cli options
- [ ] Improve usage to not require yarn/npm install - maybe bundle with rollup? And allow usage with npx?
- [ ] Customise generation process to output just the client package required e.g --client=[dart,react,vue]
- [ ] Accept path to output client package to e.g --output=./path/to/dir
- [ ] Offer customization options for client version, name, etc
- [ ] Improve documentation. This will probably never be completed :\
