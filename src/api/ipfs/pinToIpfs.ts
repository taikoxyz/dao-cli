import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export interface IpfsPinResponse {
  ipfsHash: string;
  pinSize?: number;
  timestamp?: string;
}

/**
 * Pin JSON data to IPFS using Pinata
 */
export async function pinJsonToIpfs(data: unknown): Promise<string> {
  if (!process.env.PINATA_JWT) {
    throw new Error(
      'IPFS pinning not configured. Please set PINATA_JWT in your .env file.\n' +
        'Get your JWT from https://app.pinata.cloud/developers/api-keys',
    );
  }

  return pinToPinata(data);
}

/**
 * Pin to Pinata using JWT
 */
async function pinToPinata(data: unknown): Promise<string> {
  try {
    console.info('Pinning to IPFS via Pinata...');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PINATA_JWT}`,
    };

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: data,
        pinataMetadata: {
          name: `proposal-${Date.now()}`,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      },
      { headers },
    );

    console.info(`Successfully pinned to IPFS: ${response.data.IpfsHash}`);
    return response.data.IpfsHash;
  } catch (error: unknown) {
    const err = error as { response?: { status: number; data?: { error?: string } }; message?: string };
    if (err.response?.status === 401) {
      throw new Error('Invalid Pinata credentials. Please check your PINATA_JWT.');
    }
    if (err.response?.status === 429) {
      throw new Error('Pinata rate limit exceeded. Please wait and try again.');
    }
    throw new Error(`Failed to pin to Pinata: ${err.response?.data?.error || err.message || 'Unknown error'}`);
  }
}

/**
 * Test IPFS pinning configuration
 */
export async function testIpfsPinning(): Promise<boolean> {
  try {
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'IPFS pinning test',
    };

    const hash = await pinJsonToIpfs(testData);
    console.info(`IPFS pinning test successful! Hash: ${hash}`);
    return true;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error(`IPFS pinning test failed: ${err.message || 'Unknown error'}`);
    return false;
  }
}
