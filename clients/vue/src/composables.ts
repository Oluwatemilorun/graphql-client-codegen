import { hasInjectionContext, inject, ref } from 'vue';
import type { Ref } from 'vue';

import { GraphqlClient, getClientKey } from './client';

export const useLocalStorage = (
  key: string,
  initialState: string,
): readonly [Ref<string>, (data: string) => void, () => void] => {
  const item = ref(initialState);

  try {
    item.value =
      (typeof window !== 'undefined' && window.localStorage.getItem(key)) || initialState;
  } catch (err) {
    item.value = initialState;
  }

  const save = (data: string): void => {
    item.value = data;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, data);
    }
  };

  const remove = (): void => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  };

  return [item, save, remove] as const;
};

export function useGraphqlClient(id = ''): GraphqlClient {
  // ensures that `inject()` can be used
  if (!hasInjectionContext()) {
    throw new Error(
      'graphql-client hooks can only be used inside setup() function or functions that support injection context.',
    );
  }

  const key = getClientKey(id);
  const client = inject<GraphqlClient>(key);

  if (!client) {
    throw new Error(
      "No 'GraphqlClient' found in Vue context, use 'GraphqlClientPlugin' to properly initialize the library.",
    );
  }

  return client;
}
