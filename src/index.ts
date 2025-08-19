import './util/stringifyJsonWithBigInt';
import { cache } from './api/cache';
import getContractsPrompt from './api/getContracts.prompt';
import interactWithContractPrompt from './api/interactWithContract.prompt';
import { selectNetworkPrompt } from './api/selectNetwork.prompt';
import connectEnvWallet from './api/web3/connectEnvWallet';
import { selectMainMenuPrompt } from './cli/mainMenu.prompt';
import { INetworkConfig } from './types/network.type';
import { default as HoleskyValues } from './config/holesky.config.json';
import { default as MainnetValues } from './config/mainnet.config.json';

async function mainLoop(config: INetworkConfig) {
  console.log('\n\n\n');

  const { abi, name, address } = await getContractsPrompt(config);

  await interactWithContractPrompt(config, name, address, abi);
  return mainLoop(config);
}

function getNetworkFromArgs(): string | undefined {
  const args = process.argv.slice(2);
  const networkIndex = args.indexOf('--network');
  if (networkIndex !== -1 && args[networkIndex + 1]) {
    return args[networkIndex + 1];
  }
  return undefined;
}

function getConfigByNetwork(network: string): INetworkConfig {
  if (network === 'holesky') {
    return HoleskyValues as INetworkConfig;
  }
  if (network === 'mainnet') {
    return MainnetValues as INetworkConfig;
  }
  throw new Error(`Network ${network} is not supported. Use 'mainnet' or 'holesky'.`);
}

async function main() {
  let config: INetworkConfig;
  
  // Check for network argument
  const networkArg = getNetworkFromArgs();
  if (networkArg) {
    try {
      config = getConfigByNetwork(networkArg);
      console.info(`\n🌐 Using ${networkArg} network (specified via command line)\n`);
    } catch (error) {
      console.error(`\n❌ ${error}\n`);
      process.exit(1);
    }
  } else {
    // If no network specified, show the prompt
    config = await selectNetworkPrompt();
  }
  const lastUsedConfig = (await cache.get('lastUsedConfig')) as INetworkConfig | undefined;
  if (!lastUsedConfig || lastUsedConfig.network !== config.network) {
    console.info(`Network changed from ${lastUsedConfig?.network} to ${config.network}. Clearing cache...`);
    await cache.clear();
  }
  await cache.set('lastUsedConfig', config);

  let walletClient;
  // wallet loading
  try {
    walletClient = await connectEnvWallet(config);
    console.info(`\n👛 Connected to [${config.network}] wallet with address: ${walletClient.account?.address}\n`);
  } catch (error) {
    console.warn(`\n⚠️ Failed to connect ENV wallet: ${error}\n`);
  }

  try {
    //await mainLoop(config)
    await selectMainMenuPrompt(config, walletClient!);
  } catch (error) {
    process.exit(1);
  }
}

main();
