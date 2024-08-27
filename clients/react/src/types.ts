import {
  QueryKey,
  UseMutationOptions as _UseMutationOptions,
  UseMutationResult,
  UseQueryOptions as _UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';

export enum UploadFor {
  restaurant = 'restaurant',
  kyc = 'kyc',
  category = 'category',
  user = 'user',
  menu = 'menu',
  meals = 'meals',
}

export type UseQueryOptionsWrapper<
  // Return type of queryFn
  TQueryFn = unknown,
  // Type thrown in case the queryFn rejects
  E = Error,
  // Query key type
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  _UseQueryOptions<TQueryFn, E, TQueryFn, TQueryKey>,
  'queryKey' | 'queryFn' | 'select' | 'refetchInterval'
>;

export type TQueryKey<TKey, TListQuery = any, TDetailQuery = string> = {
  all: [TKey];
  lists: () => [...TQueryKey<TKey>['all'], 'list'];
  list: (
    query?: TListQuery,
  ) => [...ReturnType<TQueryKey<TKey>['lists']>, { query: TListQuery | undefined }];
  details: () => [...TQueryKey<TKey>['all'], 'detail'];
  detail: (id: TDetailQuery) => [...ReturnType<TQueryKey<TKey>['details']>, TDetailQuery];
};

export type QueryArgs = Record<string, unknown>;
export type MutationInputs = Record<string, unknown>;

export type UseQueryOptions<TArgs = QueryArgs, TData = unknown> = {
  args: TArgs;
  fields: string;
  options?: _UseQueryOptions<TData, Error, TData>;
  queryKey?: QueryKey;
};

export type UseMutationVariables<TParams = MutationInputs> = TParams extends void
  ? {
      fields: string;
    }
  : {
      params: TParams;
      fields: string;
    };

export type UseQuery<TArgs = QueryArgs, TData = unknown> = (
  opt: TArgs extends void
    ? Omit<UseQueryOptions<TArgs, TData>, 'args'>
    : UseQueryOptions<TArgs, TData>,
) => UseQueryResult<TData, Error>;

export type UseMutation<TParams = QueryArgs, TData = unknown> = (
  opt?: _UseMutationOptions<TData, Error, UseMutationVariables<TParams>, unknown>,
) => UseMutationResult<TData, Error, UseMutationVariables<TParams>, unknown>;
