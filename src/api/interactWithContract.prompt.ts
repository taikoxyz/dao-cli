import { Abi, Address } from 'viem';
import { INetworkConfig } from '../types/network.type';
import { select } from '@inquirer/prompts';
import { getPublicClient } from './viem';

export default async function interactWithContractPrompt(
  config: INetworkConfig,
  name: string,
  address: Address,
  abi: any[],
) {
  console.log(`Interacting with contract [${name}]: ${address}`);

  const readActions = abi.filter((item) => item.type === 'function' && item.stateMutability === 'view');
  const writeActions = abi.filter((item) => item.type === 'function' && item.stateMutability !== 'view');

  console.log(`Available read actions: ${readActions.length}`);
  console.log(`Available write actions: ${writeActions.length}`);

  const methodName = await select({
    message: `Select the method you want to call on [${name}]: ${address}`,
    choices: [
      ...readActions.map((action) => ({
        name: `${action.name} (Read) [${action.inputs.map((i: any) => i.name).join(', ')}]`,
        value: action.name,
      })),
      ...writeActions.map((action) => ({
        name: `${action.name} (Write) [${action.inputs.map((i: any) => i.name).join(', ')}]`,
        value: action.name,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name)),
  });

  const isRead = readActions.some((action) => action.name === methodName);
  const isWrite = writeActions.some((action) => action.name === methodName);

  if ((!isRead && !isWrite) || (isRead && isWrite)) {
    throw new Error(`Method ${methodName} is not a valid read or write method.`);
  }

  // check for input parameters
  const method = abi.find((item) => item.name === methodName && item.type === 'function');
  if (!method) {
    throw new Error(`Method ${methodName} not found in contract ABI.`);
  }

  if (method.inputs.length) {
    console.error(`⚠️ Methods with parameters not supported yet. Please interact via ${config.urls.explorer} instead.`);
    return;
  }

  if (isRead) {
    const client = getPublicClient(config);
    console.log(`Reading from contract [${name}]: ${address}, method: ${methodName}`);
    const res = await client.readContract({
      address: address,
      abi: abi as Abi,
      functionName: methodName,
    });

    console.log(`> Result:`, res);
    return res;
  }

  if (isWrite) {
    console.error(`⚠️ Read operations not supported yet. Please interact via ${config.urls.explorer} instead.`);
    return;
  }
  console.log({ methodName, isRead, isWrite });
}
