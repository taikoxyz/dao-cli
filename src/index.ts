import "./util/stringifyJsonWithBigInt"
import { cache } from "./api/cache"
import getContractsPrompt from "./api/getContracts.prompt"
import interactWithContractPrompt from "./api/interactWithContract.prompt"
import { selectNetworkPrompt } from "./api/selectNetwork.prompt"
import connectEnvWallet from "./api/web3/connectEnvWallet"
import { selectMainMenuPrompt } from "./cli/mainMenu.prompt"
import { INetworkConfig } from "./types/network.type"

async function mainLoop(config: INetworkConfig){
    console.log("\n\n\n")

  const { abi, name, address} = await getContractsPrompt(config)

        await interactWithContractPrompt(
            config,
            name,
            address,
            abi
        )
    return mainLoop(config)
}

async function main(){
    const config = await selectNetworkPrompt()
const lastUsedConfig = await cache.get('lastUsedConfig') as INetworkConfig | undefined
if (!lastUsedConfig || lastUsedConfig.network !== config.network) {
    console.info(`Network changed from ${lastUsedConfig?.network} to ${config.network}. Clearing cache...`);
    await cache.clear();
}
    await cache.set('lastUsedConfig', config)

    let walletClient
    // wallet loading 
    try {
walletClient = await connectEnvWallet(config)
        console.info(`\n👛 Connected to [${config.network}] wallet with address: ${walletClient.account?.address}\n`)

    } catch (error){
        console.warn(`\n⚠️ Failed to connect ENV wallet: ${error}\n`)
    }

    try {
        //await mainLoop(config)
        await selectMainMenuPrompt(config, walletClient!)
    } catch (error){
        process.exit(1)
    }

}

main()