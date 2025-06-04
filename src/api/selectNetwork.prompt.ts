import { select } from '@inquirer/prompts';
import { default as HoleskyValues } from '../config/holesky.config.json';
import { default as MainnetValues } from '../config/mainnet.config.json';
import { INetworkConfig } from '../types/network.type';

export async function selectNetworkPrompt(): Promise<INetworkConfig> {
  const answer = await select({
    message: 'Select the network you want to use',
    choices: [
      {
        name: 'Holesky',
        value: 'holesky',
      },
      {
        name: 'Mainnet',
        value: 'mainnet',
      },
    ],
  });

  if (answer === 'holesky') {
    return HoleskyValues as INetworkConfig;
  }

  if (answer === 'mainnet') {
    return MainnetValues as INetworkConfig;
  }

  throw new Error(`Network ${answer} is not supported.`);
}
