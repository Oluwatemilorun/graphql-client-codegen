import { QueryClient, QueryKey, UseMutationOptions } from '@tanstack/react-query';

export const buildOptions = <TData, TError, TVariables, TContext, TKey extends QueryKey>(
  queryClient: QueryClient,
  queryKey?: TKey,
  options?: UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationOptions<TData, TError, TVariables, TContext> => {
  return {
    ...options,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    onSuccess: (...args): void => {
      if (options?.onSuccess) {
        return options.onSuccess(...args) as void;
      }

      if (queryKey !== undefined) {
        queryKey.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key as QueryKey });
        });
      }
    },
  };
};
