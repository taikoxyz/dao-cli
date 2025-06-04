import getContractsPrompt from "./api/getContracts.prompt"
import interactWithContractPrompt from "./api/interactWithContract.prompt"
import { selectNetworkPrompt } from "./api/selectNetwork.prompt"
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
    try {
        const config = await selectNetworkPrompt()
        await mainLoop(config)
    } catch (error){
        process.exit(1)
    }

}

main()