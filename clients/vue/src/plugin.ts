import { FirebaseApp } from 'firebase/app';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import { GraphqlClient, getClientKey } from './client';

export interface GraphqlClientPluginOptions {
  baseUrl: string;
  queryClient: QueryClient;
  firebaseApp: FirebaseApp;
  errorHandler?: <T>(e: Error) => T;
  agent: { appName: string; appVersion: string };
  clientKey?: string;
}

export const GraphqlClientPlugin = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  install(app: any, options: GraphqlClientPluginOptions): void {
    const { baseUrl, agent, firebaseApp, queryClient, clientKey, errorHandler } = options;
    const key = getClientKey(clientKey);

    const client = new GraphqlClient(
      {
        baseUrl,
        maxRetries: 0,
        agent,
      },
      firebaseApp,
      errorHandler,
    );

    app.use(VueQueryPlugin, { queryClient: queryClient });

    app.provide(key, client);
  },
};
