import * as dotenv from 'dotenv'
import { INetworkConfig } from '../../types/network.type'
import { getPublicClient, getWalletClient } from '../viem'
import { Address, createWalletClient, http, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Load environment variables
dotenv.config()

export default async function connectEnvWallet(config: INetworkConfig): Promise<WalletClient>{
    let privateKey:Address = '0x'
    if (config.network === 'holesky'){
        privateKey = process.env.HOLESKY_PRIVATE_KEY as Address || '0x'
    } else if (config.network === 'mainnet'){
        privateKey = process.env.MAINNET_PRIVATE_KEY as Address || '0x'
    }
    if (!privateKey) {
        throw new Error(`No private key found for network ${config.network}. Please set HOLESKY_PRIVATE_KEY or MAINNET_PRIVATE_KEY in your .env file.`);
    }

    const walletClient = createWalletClient({
        ...config,
        account: privateKeyToAccount(privateKey),
        transport: http(config.urls.rpc)
    })

    return walletClient

}