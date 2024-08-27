import React from 'react';
import { FirebaseApp } from 'firebase/app';
import { QueryClientProvider, QueryClientProviderProps } from '@tanstack/react-query';
import { GraphqlClient } from './client';

interface GraphqlContextState {
  client: GraphqlClient;
}

const GraphqlContext = React.createContext<GraphqlContextState | null>(null);

export const useGraphqlClient = (): GraphqlClient => {
  const context = React.useContext(GraphqlContext);
  if (!context) {
    throw new Error('useGraphqlClient must be used within a GraphqlClientProvider');
  }
  return context.client;
};

interface GraphqlProviderProps {
  baseUrl: string;
  queryClientProviderProps: QueryClientProviderProps;
  firebaseApp: FirebaseApp;
  errorHandler?: (e: any) => any;
  children: React.ReactNode;
  agent: { appName: string; appVersion: string };
}

export const GraphqlClientProvider = ({
  queryClientProviderProps,
  baseUrl,
  agent,
  firebaseApp,
  errorHandler,
  children,
}: GraphqlProviderProps): React.JSX.Element => {
  const graphqlClient = new GraphqlClient(
    {
      baseUrl,
      maxRetries: 0,
      agent,
    },
    firebaseApp,
    errorHandler,
  );

  return (
    <QueryClientProvider {...queryClientProviderProps}>
      <GraphqlContext.Provider
        value={{
          client: graphqlClient,
        }}
      >
        {children}
      </GraphqlContext.Provider>
    </QueryClientProvider>
  );
};
