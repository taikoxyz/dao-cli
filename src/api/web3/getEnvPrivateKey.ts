import * as dotenv from 'dotenv'
import { INetworkConfig } from '../../types/network.type'
import { Address, } from 'viem'

// Load environment variables
dotenv.config()

export default function getEnvPrivateKey(config: INetworkConfig): Address{
    let privateKey:Address = '0x'
    if (config.network === 'holesky'){
        privateKey = process.env.HOLESKY_PRIVATE_KEY as Address || '0x'
    } else if (config.network === 'mainnet'){
        privateKey = process.env.MAINNET_PRIVATE_KEY as Address || '0x'
    }
    return privateKey

}