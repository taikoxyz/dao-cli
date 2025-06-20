import axios from 'axios'
import * as dotenv from 'dotenv'
import wait from '../../util/wait'
import { cache } from '../cache'
dotenv.config()
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs'

export default async function getIpfsFile<T>(hash: string): Promise<T | undefined>{
    const inCache = await cache.has(`ipfs:${hash}`)
    if (inCache){
        console.info(`Using cached IPFS file for hash ${hash}`);
        return cache.get(`ipfs:${hash}`) as T
    }
    try {
        // artifical wait to not overload the IPFS gateway
        await wait(500)
        const url = `${IPFS_GATEWAY}/${hash}`
    const res = await axios.get(url,{
         timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json',
      }
    })
    const content = res.data as T
await cache.set(`ipfs:${hash}`, content)
    return content
    }  catch (error: any){
        console.error(`Error fetching IPFS file with hash ${hash}:`, error.message);
    }
}