import { Address } from 'viem';

export function normalizePrivateKey(privateKey: string): Address {
  if (!privateKey) {
    throw new Error('Private key is required');
  }

  const trimmedKey = privateKey.trim();

  if (trimmedKey === '0x' || trimmedKey === '0X' || trimmedKey === '') {
    throw new Error('Private key is required');
  }

  if (trimmedKey.toLowerCase().startsWith('0x')) {
    return trimmedKey as Address;
  }

  return `0x${trimmedKey}` as Address;
}
