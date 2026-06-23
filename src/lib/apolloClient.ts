import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: '/api/graphql',
    fetch: (uri, options) => {
      // Remove the signal to prevent Next.js from throwing unhandled AbortErrors on component unmount
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { signal, ...restOptions } = options || {};
      return fetch(uri, restOptions);
    }
  }),
  cache: new InMemoryCache(),
});
