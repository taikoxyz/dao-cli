import { Address } from 'viem';
import { INetworkConfig } from '../types/network.type';
import { select } from '@inquirer/prompts';
import { isAddressEqual } from 'viem';

export default async function readContractPrompt(config: INetworkConfig, targetContract: Address) {
  const contractNameIndex = Object.values(config.contracts).findIndex((value) => isAddressEqual(value, targetContract));

  const contractName = contractNameIndex !== -1 ? Object.keys(config.contracts)[contractNameIndex] : 'Unknown Contract';

  const option = await select({
    message: `What action would you like to perform on [${contractName}]: ${targetContract}?`,
    choices: [
      {
        value: 'read',
        name: 'Read Methods',
      },
    ],
  });
}
