// ignore_for_file: overridden_fields

import 'dart:io';

import 'utils/utils.dart';
import './models.generated.dart';

part './operations.generated.dart';

/// This is the client library to make use of the Graphql APIs
///
/// It connects to the graphql API using a wrapper around [HttpClient].
///
/// This class implements the auto-generated [GraphqlOperations] mixin -
/// containing all query and mutation operations.
///
/// Example
/// ```dart
/// final GraphqlClient graphqlClient = GraphqlClient(baseUrl: 'http://localhost:4000');
/// final categories = await graphqlClient.getCategories(fields: '{ id name description }');
/// ```
///
/// Each operation accepts a `field` parameter, which is a string containing the fields to return
/// from the server in graphql SDL format.
///
/// ```dart
/// "{ field1 field2 field3 ... fieldx }"
/// ```
/// or
/// ```dart
/// """ {
///   field1
///   field2
///   field3 {
///     nestedField1
///     nestedField2
///     ...
///     nestedFieldX
///   }
///   field4
/// }"""
/// ```
class GraphqlClient = _GraphqlClient with GraphqlOperations;

abstract class _GraphqlClient extends Http {
  @override
  final String baseUrl;

  final int? connectTimeout;
  final ClientError Function(ClientError error)? errorHandler;

  _GraphqlClient({
    required this.baseUrl,
    this.connectTimeout,
    this.errorHandler,
  })  : super(
          baseUrl,
          errorHandler,
          timeout: connectTimeout,
        );
}
