import { select } from '@inquirer/prompts';
import { ABIs } from '../abi';
import { INetworkConfig } from '../types/network.type';

export default async function getContractsPrompt(config: INetworkConfig) {
  const contractNames = Object.keys(ABIs);

  const contractName = await select({
    message: 'Select the contract you want to interact with',
    choices: contractNames.map((name) => {
      const address = config.contracts[name as keyof typeof config.contracts];
      return {
        name: `${name} (${config.urls.explorer}address/${address})`,
        value: name,
      };
    }),
  });

  return {
    name: contractName,
    abi: ABIs[contractName as keyof typeof ABIs],
    address: config.contracts[contractName as keyof typeof config.contracts],
  };
}
