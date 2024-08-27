import {
  GraphQLSchema,
  TypeNode,
  Kind,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  ListTypeNode,
} from 'graphql';

export const mapEnumTypes = {
  DishServingUnit: 'DishServingUnit',
  OpeningDayOfWeek: 'OpeningDayOfWeek',
  KycDocumentVerificationStatus: 'KycDocumentVerificationStatus',
  KycDocumentType: 'KycDocumentType',
  WaitlistStatus: 'WaitlistStatus',
  OperatingCity: 'OperatingCity',
  DeliveryMode: 'DeliveryMode',
  FileFormat: 'FileFormat',
  Sort: 'Sort',
  VendorType: 'VendorType',
  OrderStatus: 'OrderStatus',
  TransactionStatus: 'TransactionStatus',
  TransactionType: 'TransactionType',
  VendorTierLevel: 'VendorTierLevel',
  OrderFilter: 'OrderFilter',
  PaymentMethod: 'PaymentMethod',
  CtaType: 'CtaType',
  SubscriptionStatus: 'SubscriptionStatus',
  VendorBillingPlan: 'VendorBillingPlan',
};

export const mapCustomTypes = {
  ...mapEnumTypes,
};

export const scalarTypes = [
  'String',
  'ID',
  'UUID',
  'Int',
  'Float',
  'Boolean',
  'JSON',
  'JSONObject',
];

export function getBareDartType(
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
        return 'String';
      case 'Int':
        return 'int';
      case 'Float':
        return 'double';
      case 'Boolean':
        return 'bool';
      case 'JSON':
      case 'JSONObject':
        return 'Map<String, dynamic>';
      default:
        return type.name.value;
    }
  } else {
    return getBareDartType(type.type);
  }
}

export function getDartType(type: TypeNode, customTypes: Record<string, string>): string {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return getDartType(type.type, customTypes);
  } else if (type.kind === Kind.LIST_TYPE) {
    return `List<${getDartType(type.type, customTypes)}>`;
  } else {
    return getBareDartType(type, customTypes);
  }
}

export function isScalarType(type: TypeNode): boolean {
  if (type.kind === Kind.NON_NULL_TYPE || type.kind === Kind.LIST_TYPE) {
    return isScalarType(type.type);
  } else {
    return scalarTypes.includes(type.name.value);
  }
}

export function isListType(type: TypeNode): type is ListTypeNode {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return isListType(type.type);
  } else {
    return type.kind === Kind.LIST_TYPE;
  }
}

export function getSafeFieldName(name: string): string {
  // List of illegal variable names in Dart
  const illegalNames = [
    'abstract',
    'as',
    'assert',
    'async',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'covariant',
    'default',
    'deferred',
    'do',
    'dynamic',
    'else',
    'enum',
    'export',
    'extends',
    'extension',
    'external',
    'factory',
    'false',
    'final',
    'finally',
    'for',
    'Function',
    'get',
    'hide',
    'if',
    'implements',
    'import',
    'in',
    'inout',
    'interface',
    'is',
    'late',
    'library',
    'mixin',
    'native',
    'new',
    'null',
    'of',
    'on',
    'operator',
    'out',
    'part',
    'patch',
    'required',
    'rethrow',
    'return',
    'set',
    'show',
    'source',
    'static',
    'super',
    'switch',
    'sync',
    'this',
    'throw',
    'true',
    'try',
    'typedef',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ];

  // Check if name is illegal
  if (illegalNames.includes(name)) {
    name = `$${name}`;
  }

  if (name.startsWith('_')) {
    name = name.substring(1);
  }

  return name;
}

export function isNullable(type: TypeNode): boolean {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return false;
  } else {
    return true;
  }
}

export function isEnum(bareType: string): boolean {
  return Object.keys(mapEnumTypes).includes(bareType);
}

// function capitalize(s: string): string {
//   return s.substring(0, 1).toUpperCase() + s.substring(1);
// }

function getEnumValueDeclaration(value: EnumValueDefinitionNode): string {
  const doc = value.description?.value;

  return doc === undefined
    ? `${value.name.value},`
    : `/// ${doc}
  ${value.name.value},`;
}

function getFieldDeclaration(
  field: FieldDefinitionNode | InputValueDefinitionNode,
  customTypes: Record<string, string>,
  nullCheck = true,
): string {
  const name = getSafeFieldName(field.name.value);
  const type = getDartType(field.type, customTypes);
  const nullable = nullCheck ? isNullable(field.type) : true;

  return `final ${type}${nullable && type != 'dynamic' ? '?' : ''} ${name};`;
}

function getCopyWithParamDeclaration(
  field: FieldDefinitionNode | InputValueDefinitionNode,
  customTypes: Record<string, string>,
): string {
  const name = getSafeFieldName(field.name.value);
  const type = getDartType(field.type, customTypes);

  return `${type}? ${name},`;
}

function getCopyWithFieldDeclaration(
  field: FieldDefinitionNode | InputValueDefinitionNode,
): string {
  const name = getSafeFieldName(field.name.value);

  return `${name}: ${name} ?? this.${name},`;
}

function getClassParamDeclaration(
  field: FieldDefinitionNode | InputValueDefinitionNode,
  nullCheck = true,
): string {
  const name = getSafeFieldName(field.name.value);
  const nullable = nullCheck ? isNullable(field.type) : true;

  return `${nullable ? '' : 'required '}this.${name}`;
}

// function scalarToValue(name: string): string {
//   switch (name) {
//     case 'String':
//     case 'ID':
//     case 'UUID':
//       return `''`;
//     case 'Int':
//     case 'Float':
//       return `0`;
//     case 'Boolean':
//       return 'false';
//     case 'JSON':
//     case 'JSONObject':
//       return '{}';
//     default:
//       return '{}';
//   }
// }

function getFromJsonFieldDeclaration(
  field: FieldDefinitionNode,
  customTypes: Record<string, string>,
  nullCheck = true,
): string {
  const name = getSafeFieldName(field.name.value);
  const type = getDartType(field.type, customTypes);
  const nullable = nullCheck ? isNullable(field.type) : true;
  const bareType = getBareDartType(field.type, customTypes);
  const isEnum = Object.keys(mapEnumTypes).includes(bareType);

  const jsonDecl = type.includes('List')
    ? isScalarType(field.type) && !type.includes('Map')
      ? `json["${field.name.value}"]`
      : `(json["${field.name.value}"] as List<dynamic>?)?.map((f) => ${
          type.includes('Map')
            ? `f as ${bareType}`
            : `${bareType}${
                isScalarType(field.type) || isEnum
                  ? `.values.firstWhere((e) => e.toString() == '${bareType}.$f')`
                  : '.fromJson(f)'
              }`
        }).toList() ?? []`
    : `${
        isScalarType(field.type)
          ? `json["${field.name.value}"]`
          : Object.keys(customTypes).includes(type)
          ? isEnum
            ? `json["${field.name.value}"] == null ? null : ${bareType}.values.firstWhere((e) => e.toString() == '${bareType}.\${json["${field.name.value}"]}')`
            : `json["${field.name.value}"]`
          : `json["${field.name.value}"] == null ? null : ${type}.fromJson(json["${field.name.value}"])`
      }`;

  const typeCast =
    isScalarType(field.type) && !type.includes('List')
      ? ` as ${type}${nullable && type != 'dynamic' ? '?' : ''}`
      : '';

  return `${name}: ${
    type === 'double' ? `(${jsonDecl} != null ? ${jsonDecl} + 0.0 : null)` : jsonDecl
  }${typeCast}`;
}

function getToJsonFieldDeclaration(
  field: InputValueDefinitionNode | FieldDefinitionNode,
  allFieldsNullable = false,
): string {
  const name = getSafeFieldName(field.name.value);
  const bareType = getBareDartType(field.type, mapCustomTypes);
  const type = getDartType(field.type, mapCustomTypes);

  const nameDecl =
    field.type.kind === Kind.LIST_TYPE
      ? `${name}${allFieldsNullable || isNullable(field.type) ? '?' : ''}.map((f) => f${
          isScalarType(field.type.type) ? '' : '.toJson()'
        }).toList()`
      : `${
          isEnum(bareType)
            ? type.includes('List')
              ? `${name}${
                  allFieldsNullable || isNullable(field.type) ? '?' : ''
                }.map((f) => f.name)`
              : `${name}${allFieldsNullable || isNullable(field.type) ? '?' : ''}.name`
            : name
        }`;

  return `data["${field.name.value}"] = ${nameDecl};`;
}

function printObjectModels(
  node: ObjectTypeDefinitionNode,
  customTypes: Record<string, string>,
): string {
  const typeName = node.name.value;
  const fields = node.fields || [];

  return `
/// ${node.description?.value || node.name.value}
class ${typeName} {
  ${fields.map((field) => getFieldDeclaration(field, customTypes, false)).join('\n  ')}

  ${typeName}({
    ${fields.map((field) => getClassParamDeclaration(field, false)).join(',\n    ')},
  });

  /// Creates a copy of [${typeName}] but with the given fields replaced with the new values.
  ${typeName} copyWith({
    ${fields
      .map((field) => getCopyWithParamDeclaration(field, customTypes))
      .join('\n    ')}
  }) {
    return ${typeName}(
      ${fields.map((field) => getCopyWithFieldDeclaration(field)).join('\n      ')}
    );
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};

    ${fields.map((field) => getToJsonFieldDeclaration(field, true)).join('\n    ')}

    return data;
  }

  factory ${typeName}.fromJson(Map<String, dynamic> json) {
    return ${typeName}(
      ${fields
        .map((field) => getFromJsonFieldDeclaration(field, customTypes, false))
        .join(',\n      ')},
    );
  }
}
`;
}

function printInputObjectModels(
  node: InputObjectTypeDefinitionNode,
  customTypes: Record<string, string>,
): string {
  const typeName = node.name.value;
  const fields = node.fields || [];

  return `
/// ${node.description?.value || node.name.value}
class ${typeName} {
  ${fields.map((field) => getFieldDeclaration(field, customTypes)).join('\n  ')}

  ${typeName}({
    ${fields.map((field) => getClassParamDeclaration(field)).join(',\n    ')},
  });

  /// Creates a copy of [${typeName}] but with the given fields replaced with the new values.
  ${typeName} copyWith({
    ${fields
      .map((field) => getCopyWithParamDeclaration(field, customTypes))
      .join('\n    ')}
  }) {
    return ${typeName}(
      ${fields.map((field) => getCopyWithFieldDeclaration(field)).join('\n      ')}
    );
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};

    ${fields.map((field) => getToJsonFieldDeclaration(field)).join('\n    ')}

    return data;
  }
}
`;
}

function printEnumObjectModels(node: EnumTypeDefinitionNode): string {
  const typeName = node.name.value;
  const values = node.values || [];

  return `
/// ${node.description?.value || node.name.value}
enum ${typeName} {
  ${values.map((value) => getEnumValueDeclaration(value)).join('\n  ')}
}
`;
}

function generateDartModels(schema: GraphQLSchema): string {
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
        // console.log(typeName, typeEntry.astNode.fields);
        models.push(printObjectModels(typeEntry.astNode, mapCustomTypes));
        break;

      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        models.push(printInputObjectModels(typeEntry.astNode, mapCustomTypes));
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
  // TODO: check for @Deprecated() in description and create a decorator for it
  return generateDartModels(schema);
};
