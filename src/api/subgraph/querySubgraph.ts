import { GraphQLClient } from 'graphql-request';
import { INetworkConfig } from '../../types/network.type';

export default async function querySubgraph<T>(config:INetworkConfig, query: string, params?: Record<string, string | number | boolean | bigint>):Promise<T>{
    const client = new GraphQLClient(config.subgraph)
    const res = await client.request(query, params)
    console.log(`Subgraph query: ${query}`);
    console.log(`Subgraph params: ${JSON.stringify(params)}`);
    console.log(`Subgraph response: ${JSON.stringify(res)}`);
    return res as T
}