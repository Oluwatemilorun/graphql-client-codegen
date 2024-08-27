import { FieldDefinitionNode, GraphQLSchema, Kind } from 'graphql';
import { getType, mapCustomTypes } from './typescript-models';
import { getTypeFromArg } from './typescript-operations';
import { isScalarType } from './dart-models';

function convertToComposableName(input: string): string {
  const capitalized = input.charAt(0).toUpperCase() + input.slice(1);
  return 'use' + capitalized;
}

function printComposables(
  queries: string[],
  mutations: string[],
  imports: Set<string>,
): string {
  return `/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery } from '@tanstack/vue-query';
import { useGraphqlClient } from './composables';
import { UseMutation, UseQuery } from './types';
import {
  ${Array.from(imports).join(`,\n	`).replace(`	,\n`, '')}
} from './types.generated';
${mutations.join(`\n`)}
${queries.join(`\n`)}
`;
}

function printQueryComposables(
  nodes: readonly FieldDefinitionNode[],
  imports: Set<string>,
): string[] {
  return nodes.map((node) => {
    const queryName = node.name.value;
    const returnType = getType(node.type, mapCustomTypes);
    const argsParams = node.arguments
      ?.map((arg) => {
        const typeName = getTypeFromArg(arg.type, mapCustomTypes);
        const isNullable = arg.type.kind !== Kind.NON_NULL_TYPE;
        if (!isScalarType(arg.type)) imports.add(typeName);
        return `${arg.name.value}${isNullable ? '?' : ''}: ${typeName}`;
      })
      .join('; ');

    if (!isScalarType(node.type)) imports.add(getTypeFromArg(node.type, mapCustomTypes));

    return `
/**
 * ${node.description?.value || node.name.value}
 */
export const ${convertToComposableName(queryName)}: UseQuery<
  ${argsParams ? `{ ${argsParams} }` : 'void'},
  ${returnType}
> = ({ ${argsParams ? 'args, ' : ''}fields, options, queryKey }) => {
  const client = useGraphqlClient();
  return useQuery({ queryKey: queryKey || ['${queryName}'${
      argsParams ? `, args` : ''
    }], queryFn: () => client.${queryName}(${
      argsParams ? 'args, ' : ''
    }fields), ...options });
};`;
  });
}

function printMutationComposables(
  nodes: readonly FieldDefinitionNode[],
  imports: Set<string>,
): string[] {
  return nodes.map((node) => {
    const queryName = node.name.value;
    const returnType = getType(node.type, mapCustomTypes);
    const argsParams = node.arguments
      ?.map((arg) => {
        const typeName = getTypeFromArg(arg.type, mapCustomTypes);
        const isNullable = arg.type.kind !== Kind.NON_NULL_TYPE;
        if (!isScalarType(arg.type)) imports.add(typeName);
        return `${arg.name.value}${isNullable ? '?' : ''}: ${typeName}`;
      })
      .join('; ');

    if (!isScalarType(node.type)) imports.add(getTypeFromArg(node.type, mapCustomTypes));

    return `
/**
 * ${node.description?.value || node.name.value}
 */
export const ${convertToComposableName(queryName)}: UseMutation<
  ${argsParams ? `{ ${argsParams} }` : 'void'},
  ${returnType}
> = (opts) => {
  const client = useGraphqlClient();
  return useMutation({ mutationFn: ({${
    argsParams ? ' params,' : ''
  } fields }) => client.${queryName}(${argsParams ? 'params, ' : ''}fields), ...opts });
};`;
  });
}

function generateReactComposables(schema: GraphQLSchema): string {
  const imports = new Set<string>();

  const queryNodes = schema.getQueryType()?.astNode?.fields || [];
  const mutationNodes = schema.getMutationType()?.astNode?.fields || [];
  const queries = printQueryComposables(queryNodes, imports);
  const mutations = printMutationComposables(mutationNodes, imports);

  return printComposables(queries, mutations, imports);
}

export const plugin = (schema: GraphQLSchema): string => {
  return generateReactComposables(schema);
};
