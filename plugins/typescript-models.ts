import {
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  GraphQLSchema,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql';

export const mapCustomTypes = {
  DishServingUnit: 'DishServingUnit',
  OpeningDayOfWeek: 'OpeningDayOfWeek',
  KycDocumentVerificationStatus: 'KycDocumentVerificationStatus',
  KycDocumentType: 'KycDocumentType',
  WaitlistStatus: 'WaitlistStatus',
};

export function getBareTsType(
  type: TypeNode,
  customTypes: Record<string, string> = {},
): string {
  if (type.kind === Kind.NAMED_TYPE) {
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
  } else {
    return getBareTsType(type.type);
  }
}

export function getType(type: TypeNode, customTypes: Record<string, string>): string {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return getType(type.type, customTypes);
  } else if (type.kind === Kind.LIST_TYPE) {
    return `${getType(type.type, customTypes)}[]`;
  } else {
    return getBareTsType(type, customTypes);
  }
}

export function isNullable(type: TypeNode): boolean {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return false;
  } else {
    return true;
  }
}

function getEnumValueDeclaration(value: EnumValueDefinitionNode): string {
  const decl = `${value.name.value} = '${value.name.value}',`;

  return value.description?.value
    ? `/** ${value.description?.value} */
  ${decl}`
    : decl;
}

function getFieldDeclaration(
  field: FieldDefinitionNode | InputValueDefinitionNode,
  customTypes: Record<string, string>,
  objectKind: Kind.OBJECT_TYPE_DEFINITION | Kind.INPUT_OBJECT_TYPE_DEFINITION,
): string {
  const makeNullable = objectKind === Kind.OBJECT_TYPE_DEFINITION;
  const decl =
    field.name.value +
    `${makeNullable || isNullable(field.type) ? '?' : ''}: ${getType(
      field.type,
      customTypes,
    )};`;
  if (field.description)
    return `/** ${field.description.value} */
  ${decl}`;
  else return decl;
}

function printObjectModels(
  node: ObjectTypeDefinitionNode | InputObjectTypeDefinitionNode,
  customTypes: Record<string, string>,
  objectKind: Kind.OBJECT_TYPE_DEFINITION | Kind.INPUT_OBJECT_TYPE_DEFINITION,
): string {
  const typeName = node.name.value;
  const fields = node.fields || [];

  return `/**
 * ${node.description?.value || node.name.value}
 */
export interface ${typeName} {
  ${fields
    .map((field) => getFieldDeclaration(field, customTypes, objectKind))
    .join('\n  ')}
}

`;
}

function printEnumObjectModels(node: EnumTypeDefinitionNode): string {
  const typeName = node.name.value;
  const values = node.values || [];

  return `/**
 * ${node.description?.value || node.name.value}
 */
export enum ${typeName} {
  ${values.map((value) => getEnumValueDeclaration(value)).join('\n  ')}
}
`;
}

function generateTsModels(schema: GraphQLSchema): string {
  const models = [] as string[];
  const ignoreDefs = ['Mutation', 'Query'];
  const types = schema.getTypeMap();

  // Iterate over the types in the schema
  for (const type in types) {
    const typeEntry = types[type];
    const typeName = typeEntry.name;

    // Ignore introspection types
    if (typeName.startsWith('__')) continue;

    // Ignore other definitions
    if (ignoreDefs.includes(typeName)) continue;

    switch (typeEntry.astNode?.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        // console.log(typeName, typeEntry.astNode.fields);
        models.push(
          printObjectModels(typeEntry.astNode, mapCustomTypes, typeEntry.astNode.kind),
        );
        break;

      case Kind.ENUM_TYPE_DEFINITION:
        models.push(printEnumObjectModels(typeEntry.astNode));
        break;

      default:
        break;
    }
  }

  return models.join('');
}

export const plugin = (schema: GraphQLSchema): string => {
  return generateTsModels(schema);
};
