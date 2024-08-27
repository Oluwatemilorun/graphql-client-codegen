/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GraphQLSchema, TypeNode, FieldDefinitionNode, Kind } from 'graphql';
import { getType, mapCustomTypes } from './typescript-models';
import { getSdlType } from './dart-operations';
import { isScalarType } from './dart-models';

function printOperations(
  queries: string[],
  mutations: string[],
  imports: Set<string>,
): string {
  return `/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ${Array.from(imports).join(`,\n	`).replace(`	,\n`, '')}
} from './types.generated';

export interface GraphqlOperations {
	_request<T, V = object>(query: string | FormData, variables?: V, headers?: Record<string, unknown>): Promise<T>;
}

export const _CLIENT_VERSION_ = '${process.env.npm_package_version || '0.0.0'}';

export abstract class GraphqlOperations {
  ${mutations.join(`\n`)}
  ${queries.join(`\n`)}
}
`;
}

export function getTypeFromArg(
  type: TypeNode,
  customTypes: Record<string, string>,
): string {
  if (type.kind === Kind.NON_NULL_TYPE || type.kind === Kind.LIST_TYPE) {
    return getTypeFromArg(type.type, customTypes);
  } else {
    if (Object.keys(customTypes).includes(type.name.value)) {
      return customTypes[type.name.value];
    }

    switch (type.name.value) {
      case 'String':
      case 'ID':
      case 'UUID':
        return 'string';
      case 'Int':
      case 'Float':
        return 'number';
      case 'Boolean':
        return 'boolean';
      case 'JSON':
      case 'JSONObject':
        return 'Record<string, any>';
      default:
        return type.name.value;
    }
  }
}

// function printOperationMethod(
//   operation: 'query' | 'mutation',
//   nodes: readonly FieldDefinitionNode[],
//   imports: Set<string>,
// ): string[] {
//   return nodes.map((node) => {
//     const queryName = node.name.value;
//     const returnType = getType(node.type, mapCustomTypes);
//     const args = node.arguments
//       ?.map((arg) => {
//         return `\$${arg.name.value}: ${getSdlType(arg.type)}`;
//       })
//       .join(', ');
//     const argsBare = node.arguments
//       ?.map((arg) => `${arg.name.value}: \$${arg.name.value}`)
//       .join(', ');

//     const argsParams = node.arguments
//       ?.filter((arg) => arg.type.kind === Kind.NON_NULL_TYPE)
//       .map((arg) => {
//         const typeName = getTypeFromArg(arg.type, mapCustomTypes);
//         if (!isScalarType(arg.type)) imports.add(typeName);
//         return `${arg.name.value}: ${typeName}`;
//       })
//       .join(', ');
//     const nullableArgsParams = node.arguments
//       ?.filter((arg) => arg.type.kind !== Kind.NON_NULL_TYPE)
//       .map((arg) => {
//         const typeName = getTypeFromArg(arg.type, mapCustomTypes);
//         if (!isScalarType(arg.type)) imports.add(typeName);
//         return `${arg.name.value}?: ${typeName}`;
//       })
//       .join(', ');

//     if (!isScalarType(node.type)) imports.add(getTypeFromArg(node.type, mapCustomTypes));

//     return `
//   /**
//    * ${node.description?.value || node.name.value}
//    */
//   async ${queryName}(${argsParams && `${argsParams}, `}info: string${
//       nullableArgsParams && `, ${nullableArgsParams}`
//     }): Promise<${returnType}> {
//     return (await this._request<
//       { ${queryName}: ${returnType} }
//     >(
//       \`${operation} ${queryName}${args && `(${args})`} {
//         ${queryName}${args && `(${argsBare})`} \${info}
//       }\`,
//       ${args && `{ ${node.arguments?.map((arg) => `${arg.name.value}`).join(', ')} }`}
//     )).${queryName};
//   }`;
//   });
// }

function printOperationMethod(
  operation: 'query' | 'mutation',
  nodes: readonly FieldDefinitionNode[],
  imports: Set<string>,
): string[] {
  return nodes.map((node) => {
    const queryName = node.name.value;
    const returnType = getType(node.type, mapCustomTypes);
    const args = node.arguments
      ?.map((arg) => {
        return `\$${arg.name.value}: ${getSdlType(arg.type)}`;
      })
      .join(', ');
    const argsBare = node.arguments
      ?.map((arg) => `${arg.name.value}: \$${arg.name.value}`)
      .join(', ');
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
  async ${queryName}(${
      argsParams && `args: { ${argsParams} }, `
    }fields: string): Promise<${returnType}> {
    return (await this._request<{ ${queryName}: ${returnType} }>(
      \`${operation} ${queryName}${args && `(${args})`} {
        ${queryName}${args && `(${argsBare})`} \${fields}
      }\`,
      ${args && 'args,'}
    )).${queryName};
  }`;
  });
}

function generateTsOperations(schema: GraphQLSchema): string {
  const imports = new Set<string>();

  const queryNodes = schema.getQueryType()?.astNode?.fields || [];
  const mutationNodes = schema.getMutationType()?.astNode?.fields || [];
  const queries = printOperationMethod('query', queryNodes, imports);
  const mutations = printOperationMethod('mutation', mutationNodes, imports);

  return printOperations(queries, mutations, imports);
}

export const plugin = (schema: GraphQLSchema, _, { version }): string => {
  return generateTsOperations(schema);
};
