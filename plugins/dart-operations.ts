import {
  FieldDefinitionNode,
  GraphQLSchema,
  InputValueDefinitionNode,
  Kind,
  TypeNode,
} from 'graphql';
import {
  getBareDartType,
  getDartType,
  isListType,
  isScalarType,
  mapCustomTypes,
  mapEnumTypes,
} from './dart-models';

export function getSdlType(type: TypeNode, options?: Record<string, boolean>): string {
  if (type.kind === Kind.NAMED_TYPE) {
    return `${type.name.value}${options && options.nonnull ? '!' : ''}`;
  }

  if (type.kind === Kind.NON_NULL_TYPE) {
    return getSdlType(type.type, { ...options, nonnull: true });
  }

  if (type.kind === Kind.LIST_TYPE) {
    return `[${getSdlType(type.type, { ...options, list: true })}]`;
  }

  return '';
}

function printOperations(queries: string[], mutations: string[]): string {
  return `part of 'client.dart';

mixin GraphqlOperations on _GraphqlClient, Http {
  static const String clientVersion = '${process.env.npm_package_version || '0.0.0'}';
  ${queries.join('\n  ')}
  ${mutations.join('\n  ')}
}
`;
}

function getParamDefinitions(nodes: readonly InputValueDefinitionNode[]): string {
  const params = nodes
    .map((node) => {
      const isNonNull = node.type.kind === Kind.NON_NULL_TYPE;
      return `${isNonNull ? 'required' : ''} ${getDartType(node.type, mapCustomTypes)}${
        isNonNull ? '' : '?'
      } ${node.name.value}`;
    })
    .join(', ');

  return `${params}${
    params.length === 0 ? '' : ','
  } required String fields, Map<String, Object>? headers, int? retries`;
}

function getVariablesDefinitions(nodes: readonly InputValueDefinitionNode[]): string {
  return nodes
    .map((node) => {
      const bareType = getBareDartType(node.type, mapCustomTypes);
      const isEnum = Object.keys(mapEnumTypes).includes(bareType);
      const isNonNull = node.type.kind === Kind.NON_NULL_TYPE;
      const variableVal = isListType(node.type)
        ? isScalarType(node.type)
          ? `${node.name.value}`
          : `${node.name.value}.map((v) => v${
              isScalarType(node.type)
                ? ''
                : isNonNull
                ? ''
                : `?.${isEnum ? 'name' : 'toJson()'}`
            }).toList()`
        : `${node.name.value}${
            isScalarType(node.type)
              ? ''
              : isNonNull
              ? `${isEnum ? '.name' : ''}`
              : `?.${isEnum ? 'name' : 'toJson()'}`
          }`;
      return `'${node.name.value}': ${variableVal}`;
    })
    .join(',\n          ');
}

function getDocStr(description: string): string {
  return `/// ${description}
  ///
  /// [fields] is a string containing the fields to return from the server in graphql SDL format.
  /// [headers] is the headers of the request.
  /// [retries] is the number of retries if the request fails with a [ClientError.statusCode] that is greater than \`500\` or is \`429\`.
  /// Defaults to \`5\`.`;
}

function printOperationMethod(
  node: FieldDefinitionNode,
  operation: 'query' | 'mutation',
): string {
  const queryName = node.name.value;
  const returnType = getDartType(node.type, mapCustomTypes);
  const args = node.arguments
    ?.map((arg) => `\\$${arg.name.value}: ${getSdlType(arg.type)}`)
    .join(', ');
  const argsBare = node.arguments
    ?.map((arg) => `${arg.name.value}: \\$${arg.name.value}`)
    .join(', ');

  const returnDclr =
    isListType(node.type) && isScalarType(node.type)
      ? `List<${getBareDartType(node.type)}>.from(res['${queryName}'])`
      : isListType(node.type)
      ? `(res['${queryName}'] as List).map((r) => ${getBareDartType(node.type)}${
          isScalarType(node.type) ? '' : '.fromJson(r)'
        }).toList()`
      : isScalarType(node.type)
      ? `res['${queryName}']`
      : `${returnType}.fromJson(res['${queryName}'])`;

  return `
  ${getDocStr(node.description?.value || queryName)}
  Future<${returnType}${
    node.type.kind === Kind.NON_NULL_TYPE ? '' : '?'
  }> ${queryName}({${getParamDefinitions(node.arguments || [])}}) async {
    final res = await post({
      'query': '''${operation} ${queryName} ${
    args !== undefined && args.length >= 1 ? `(${args}) ` : ''
  }{
        ${queryName} ${
    args !== undefined && args.length >= 1 ? `(${argsBare}) ` : ''
  }\$fields
      }'''${
        args !== undefined && args.length >= 1
          ? `, \n      'variables': {
        ${getVariablesDefinitions(node.arguments || [])}
      }`
          : ''
      }
    }, headers: headers, retries: retries);

    return ${returnDclr};
  }`;
}

function printQueries(nodes: readonly FieldDefinitionNode[]): string[] {
  return nodes.map((node) => {
    return printOperationMethod(node, 'query');
  });
}

function printMutations(nodes: readonly FieldDefinitionNode[]): string[] {
  return nodes.map((node) => {
    return printOperationMethod(node, 'mutation');
  });
}

function generateDartOperations(schema: GraphQLSchema): string {
  const queryNodes = schema.getQueryType()?.astNode?.fields || [];
  const mutationNodes = schema.getMutationType()?.astNode?.fields || [];
  const queries = printQueries(queryNodes);
  const mutations = printMutations(mutationNodes);

  return printOperations(queries, mutations);
}

export const plugin = (schema: GraphQLSchema): string => {
  return generateDartOperations(schema);
};
