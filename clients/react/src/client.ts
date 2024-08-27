import { FirebaseApp } from 'firebase/app';
import {
  FirebaseStorage,
  getStorage,
  getDownloadURL,
  uploadBytes,
} from 'firebase/storage';
import { GraphqlOperations, _CLIENT_VERSION_ } from './operations.generated';
import {
  Config,
  Http,
  applyMixins,
  generateId,
  getDestinationRef,
  getFileExtension,
} from './utils';
import { UploadFor } from './types';

export interface _GraphqlClient {
  _handleError: (e: any) => void;
}

export interface GraphqlClient extends _GraphqlClient, GraphqlOperations {}

export class GraphqlClient {
  private storage: FirebaseStorage;

  constructor(
    public config: Config,
    public firebaseApp: FirebaseApp,
    public errorHandler?: (e: any) => any,
  ) {
    this.http = new Http(config, _CLIENT_VERSION_);
    this.storage = getStorage(firebaseApp);
  }

  public set token(token: string) {
    this.http.setToken(token);
  }

  _handleError = (e: any): unknown => {
    if (this.errorHandler) return this.errorHandler(e);
    else return e;
  };

  /**
   * Upload a file to the storage bucket
   * @param file - the file to upload
   * @param uploadFor - the resource this upload belongs to
   * @param owner - the owner of the file or user uploading the file
   * @param metadata optional metadata to add to file
   * @returns the url to uploaded file
   */
  async upload(
    file: File,
    uploadFor: UploadFor,
    owner: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const filename = generateId() + getFileExtension(file);
    const ref = getDestinationRef(this.storage, uploadFor, owner, filename);
    await uploadBytes(ref, file, metadata);

    return await getDownloadURL(ref);
  }
}

export class _GraphqlClient {
  public http!: Http;

  async _request<T, V = object>(
    query: string | FormData,
    variables: V = {} as any,
    headers: Record<string, unknown> = {},
  ): Promise<T> {
    variables = variables || ({} as any);
    const path = `/gq`;
    try {
      const res = await this.http.request<{ data: T }>(
        'POST',
        path,
        { query, variables },
        {},
        headers,
      );

      if ((res.data as any).errors) {
        throw (res.data as any).errors;
      }

      return res.data.data;
    } catch (e) {
      return Promise.reject(this._handleError(e));
    }
  }
}

applyMixins(GraphqlClient, [_GraphqlClient, GraphqlOperations]);
