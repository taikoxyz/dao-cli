import { select } from '@inquirer/prompts';
import { WalletClient } from 'viem';
import { INetworkConfig } from '../../types/network.type';
import connectEnvWallet from './connectEnvWallet';
import connectFrameWallet, { isFrameAvailable } from './connectFrameWallet';

export type WalletType = 'env' | 'frame';

interface WalletChoice {
  name: string;
  value: WalletType;
  description: string;
  disabled?: boolean | string;
}

/**
 * Prompt user to select wallet type and connect to the selected wallet.
 *
 * @param config - Network configuration
 * @returns Connected WalletClient
 */
export async function selectWalletPrompt(config: INetworkConfig): Promise<WalletClient> {
  // Check wallet availability
  const frameAvailable = await isFrameAvailable();
  const envKeyAvailable = checkEnvKeyAvailable(config);

  const choices: WalletChoice[] = [
    {
      name: 'Environment Private Key',
      value: 'env',
      description: 'Use private key from .env file',
      disabled: envKeyAvailable ? false : 'No private key found in .env',
    },
    {
      name: 'Hardware Wallet (Frame)',
      value: 'frame',
      description: 'Use Ledger/Trezor via Frame wallet',
      disabled: frameAvailable ? false : 'Frame not running (https://frame.sh)',
    },
  ];

  // If only one option is available, use it automatically
  const availableChoices = choices.filter((c) => !c.disabled);
  if (availableChoices.length === 0) {
    throw new Error(
      'No wallet available. Either:\n' +
        `  1. Set ${config.network === 'holesky' ? 'HOLESKY_PRIVATE_KEY' : 'MAINNET_PRIVATE_KEY'} in your .env file, or\n` +
        '  2. Install and run Frame wallet (https://frame.sh) with your hardware wallet connected',
    );
  }

  if (availableChoices.length === 1) {
    const walletType = availableChoices[0].value;
    console.info(`\nUsing ${availableChoices[0].name} (only available option)\n`);
    return connectWallet(walletType, config);
  }

  // Show selection prompt
  const walletType = await select<WalletType>({
    message: 'Select wallet to use',
    choices: choices.map((c) => ({
      name: c.name,
      value: c.value,
      description: c.description,
      disabled: c.disabled,
    })),
  });

  return connectWallet(walletType, config);
}

/**
 * Check if environment private key is available for the network
 */
function checkEnvKeyAvailable(config: INetworkConfig): boolean {
  if (config.network === 'holesky') {
    return !!process.env.HOLESKY_PRIVATE_KEY;
  }
  if (config.network === 'mainnet') {
    return !!process.env.MAINNET_PRIVATE_KEY;
  }
  return false;
}

/**
 * Connect to the selected wallet type
 */
async function connectWallet(walletType: WalletType, config: INetworkConfig): Promise<WalletClient> {
  switch (walletType) {
    case 'env':
      return connectEnvWallet(config);
    case 'frame':
      return connectFrameWallet(config);
    default:
      throw new Error(`Unknown wallet type: ${walletType}`);
  }
}

/**
 * Get wallet type from command line arguments
 * Usage: --wallet env|frame
 */
export function getWalletTypeFromArgs(): WalletType | undefined {
  const args = process.argv.slice(2);
  const walletIndex = args.indexOf('--wallet');
  if (walletIndex !== -1 && args[walletIndex + 1]) {
    const walletArg = args[walletIndex + 1].toLowerCase();
    if (walletArg === 'env' || walletArg === 'frame') {
      return walletArg as WalletType;
    }
  }
  return undefined;
}
