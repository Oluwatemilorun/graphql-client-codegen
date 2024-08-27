import axios, {
  AxiosError,
  AxiosInstance,
  AxiosPromise,
  AxiosRequestHeaders,
} from 'axios';
import * as rax from 'retry-axios';
import { v4 as uuidv4 } from 'uuid';

export interface Config {
  baseUrl: string;
  maxRetries: number;
  agent: { appName: string; appVersion: string };
  // apiKey?: string;
  // publishableApiKey?: string;
}

export interface RequestOptions {
  timeout?: number;
  numberOfRetries?: number;
}

export type RequestMethod = 'DELETE' | 'POST' | 'GET';

const defaultConfig = {
  maxRetries: 0,
  baseUrl: 'http://localhost:4000',
};

export class Http {
  private axiosClient: AxiosInstance;
  private config: Config;
  private _version: string;
  private _token?: string;

  constructor(config: Config, version: string) {
    /** @private @constant {AxiosInstance} */
    this.axiosClient = this.createClient({ ...defaultConfig, ...config });

    /** @private @constant {Config} */
    this.config = { ...defaultConfig, ...config };

    /** @private @constant {string} */
    this._version = version;
  }

  setToken(token: string): void {
    this._token = token;
  }

  shouldRetryCondition(err: AxiosError, numRetries: number, maxRetries: number): boolean {
    // Obviously, if we have reached max. retries we stop
    if (numRetries >= maxRetries) {
      return false;
    }

    // If no response, we assume a connection error and retry
    if (!err.response) {
      return true;
    }

    // Retry on conflicts
    if (err.response.status === 409) {
      return true;
    }

    // All 5xx errors are retried
    // OBS: We are currently not retrying 500 requests, since our core needs proper error handling.
    //      At the moment, 500 will be returned on all errors, that are not of type MedusaError.
    if (err.response.status > 500 && err.response.status <= 599) {
      return true;
    }

    return false;
  }

  /**
   * Creates the axios client used for requests
   * As part of the creation, we configure the retry conditions
   * and the exponential backoff approach.
   * @param {Config} config user supplied configurations
   * @return {AxiosInstance}
   */
  createClient(config: Config): AxiosInstance {
    const client = axios.create({
      baseURL: config.baseUrl,
    });

    rax.attach(client);

    client.defaults.raxConfig = {
      instance: client,
      retry: config.maxRetries,
      backoffType: 'exponential',
      shouldRetry: (err: AxiosError): boolean => {
        const cfg = rax.getConfig(err);
        if (cfg) {
          return this.shouldRetryCondition(
            err,
            cfg.currentRetryAttempt ?? 1,
            cfg.retry ?? 3,
          );
        } else {
          return false;
        }
      },
    };

    return client;
  }

  /**
   * Axios request
   * @param method request method
   * @param path request path
   * @param payload request payload
   * @param options axios configuration
   * @param customHeaders custom request headers
   * @return
   */
  async request<T>(
    method: RequestMethod,
    path: string,
    payload: Record<string, any> = {},
    options: RequestOptions = {},
    customHeaders: Record<string, any> = {},
  ): Promise<AxiosPromise<T>> {
    const reqOpts = {
      method,
      withCredentials: true,
      url: path,
      json: true,
      headers: this.setHeaders(options, method, customHeaders),
    };

    if (['POST', 'DELETE'].includes(method)) {
      (reqOpts as Record<string, unknown>)['data'] = payload;
    }

    // e.g. data = { cart: { ... } }, response = { status, headers, ... }
    // const { data, ...response } = await this.axiosClient(reqOpts);

    // e.g. would return an object like of this shape { cart, response }
    // return { ...data, response };
    return this.axiosClient(reqOpts) as AxiosPromise<T>;
  }

  // Stolen from https://github.com/stripe/stripe-node/blob/fd0a597064289b8c82f374f4747d634050739043/lib/utils.js#L282
  normalizeHeaders(obj: object): Record<string, any> {
    if (!(obj && typeof obj === 'object')) {
      return obj;
    }

    return Object.keys(obj).reduce((result: Record<string, string>, header) => {
      result[this.normalizeHeader(header)] = (obj as Record<string, string>)[header];
      return result;
    }, {});
  }

  // Stolen from https://github.com/marten-de-vries/header-case-normalizer/blob/master/index.js#L36-L41
  normalizeHeader(header: string): string {
    return header
      .split('-')
      .map((text) => text.charAt(0).toUpperCase() + text.substr(1).toLowerCase())
      .join('-');
  }

  getUserAgent(): string {
    const navigatorUserAgent = window?.navigator?.userAgent || '';
    const appName = this.config.agent.appName
      .split('-')
      .map((text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase())
      .join('');

    return `GraphqlClient/${this._version} ${appName}/${this.config.agent.appVersion} ${navigatorUserAgent}`;
  }

  /**
   * Creates all the initial headers.
   * We add the idempotency key, if the request is configured to retry.
   * @param {object} userHeaders user supplied headers
   * @param {Types.RequestMethod} method request method
   * @param {string} path request path
   * @param {object} customHeaders user supplied headers
   * @return {object}
   */
  setHeaders(
    userHeaders: RequestOptions,
    method: RequestMethod,
    customHeaders: Record<string, any> = {},
  ): AxiosRequestHeaders {
    let defaultHeaders: Record<string, any> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Graphql-Client': this._version,
      'User-Agent': this.getUserAgent(),
    };

    if (this._token) {
      defaultHeaders = {
        ...defaultHeaders,
        Authorization: `Bearer ${this._token}`,
      };
    }

    // const publishableApiKey =
    //   this.config.publishableApiKey || KeyManager.getPublishableApiKey();

    // if (publishableApiKey) {
    //   defaultHeaders['x-publishable-api-key'] = publishableApiKey;
    // }

    // only add idempotency key, if we want to retry
    if (this.config.maxRetries > 0 && method === 'POST') {
      defaultHeaders['Idempotency-Key'] = uuidv4();
    }

    return Object.assign(
      {},
      defaultHeaders,
      this.normalizeHeaders(userHeaders),
      customHeaders,
    );
  }
}
