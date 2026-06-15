import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: '/api/graphql', // Assuming graphql-yoga is served here
  }),
  cache: new InMemoryCache(),
});
