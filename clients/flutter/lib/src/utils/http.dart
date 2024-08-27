import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:retry/retry.dart';

import 'constants.dart';

class ClientError {
  final String message;
  final int statusCode;
  final Map<String, dynamic> error;

  ClientError({
    required this.message,
    required this.statusCode,
    required this.error,
  });
}

class ClientAgent {
  /// The name of the app that is using the client
  final String appName;

  /// The version of the app that is using the client
  final String appVersion;

  ClientAgent({required this.appName, required this.appVersion});
}

class Http {
  final HttpClient _client = HttpClient();
  final String baseUrl;
  final int? timeout;
  final ClientError Function(ClientError error)? errHandler;

  final Uri _uri;
  String? _token;

  Http(
    this.baseUrl,
    this.errHandler, {
    this.timeout,
  }) : _uri = Uri.parse(baseUrl) {
    _client.connectionTimeout = Duration(milliseconds: timeout ?? 30000);
  }

  Future<Map<String, dynamic>> _streamToJson(Stream stream) async {
    const JsonDecoder decoder = JsonDecoder();
    final json = await stream.transform(decoder).first;
    return json as Map<String, dynamic>;
  }

  String _getValidationErrorMessage(Map<String, dynamic> error) {
    if (error['children'] != null && (error['children'] as List).isNotEmpty) {
      return _getValidationErrorMessage(error['children'].first);
    }

    if (error['constraints'] != null) {
      return error['constraints'].values.first;
    } else {
      return 'Error in request data';
    }
  }

  String _getErrorMessage(Map<String, dynamic> error) {
    String message = error['message'];

    if (message.toLowerCase().contains('argument validation')) {
      final validationError = error['extensions']['errors'][0];
      return _getValidationErrorMessage(validationError);
    }

    return message;
  }

  Future _post(Map<String, dynamic> body,
      {Map<String, Object>? headers}) async {
    try {
      final requestBody = json.encode(body);
      HttpClientRequest request = await _client.postUrl(_uri);
      request.headers.add(HttpHeaders.contentTypeHeader, 'application/json');

      if (_token != null) {
        request.headers.add(HttpHeaders.authorizationHeader, 'Bearer $_token');
      }

      if (headers != null) {
        for (final header in headers.keys) {
          request.headers.add(header, headers[header]!);
        }
      }

      request.write(requestBody);
      final httpResponse = await request.close();
      final statusCode = httpResponse.statusCode;
      final response = httpResponse.transform(utf8.decoder);

      final res = await _streamToJson(response);

      final data = res['data'];
      final errors = res['errors'];

      if (data == null && errors != null) {
        final error = errors[0];
        final message = _getErrorMessage(error);

        ClientError clientError = ClientError(
          message: message,
          statusCode: statusCode == 200 ? 400 : statusCode,
          error: error['extensions'],
        );

        if (errHandler == null) {
          return Future.error(clientError);
        } else {
          return Future.error(errHandler!(clientError));
        }
      } else if (data == null && errors == null) {
        throw const SocketException('Invalid server');
      }

      return data;
    } catch (e) {
      String message;
      int statusCode;
      if (e is SocketException ||
          e is HandshakeException ||
          e is TlsException) {
        message = 'Network Error. Re-try later.';
        statusCode = 503;
      } else if (e is TimeoutException) {
        message = 'Connection timeout error. Re-try later.';
        statusCode = 504;
      } else if (e is HttpException) {
        message = 'Error processing the request. Re-try later.';
        statusCode = 500;
      } else {
        message = 'An error occurred.';
        statusCode = 500;
      }

      return Future.error(
        ClientError(
          message: message,
          statusCode: statusCode,
          error: {
            'code': 'CLIENT_ERROR',
            'errors': [
              {'message': e.toString()},
            ]
          },
        ),
      );
    }
  }

  /// Sets the authorization token that passed to the autorization header for authenticated requests.
  void setAuthorizationToken(String token) {
    _token = token;
  }

  /// Calls the [HttpClient.close] methods and shuts down the HTTP client.
  void dispose() {
    _client.close();
  }

  /// Makes a HTTP request.
  ///
  /// [body] is the body of the request.
  /// [headers] is the headers of the request.
  /// [retries] is the number of retries if the request fails with a [ClientError] exception that is greater than `500` or is `429`.
  Future post(
    Map<String, dynamic> body, {
    Map<String, Object>? headers,
    int? retries,
  }) async {
    final r = RetryOptions(
      maxAttempts: retries ?? RETRY_MAX_ATTEMPTS,
      delayFactor: const Duration(seconds: 5),
    );

    return r.retry(
      () => _post(body, headers: headers),
      retryIf: (e) {
        if (e is ClientError) {
          return (e as ClientError).statusCode >= 500 ||
              (e as ClientError).statusCode == 429;
        } else {
          return false;
        }
      },
    );
  }
}
