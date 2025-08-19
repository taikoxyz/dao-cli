#!/usr/bin/env node

import { testIpfsPinning } from '../api/ipfs/pinToIpfs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.info('Testing IPFS pinning configuration...\n');
  
  // Check which service is configured
  if (process.env.PINATA_JWT) {
    console.info('Using Pinata for IPFS pinning');
  } else {
    console.error('No IPFS pinning service configured!');
    console.info('\nPlease set PINATA_JWT in your .env file.');
    console.info('Get your JWT from https://app.pinata.cloud/developers/api-keys');
    console.info('\nSee .env.example for more details.');
    process.exit(1);
  }
  
  const success = await testIpfsPinning();
  
  if (success) {
    console.info('\nIPFS configuration is working correctly!');
    console.info('You can now create proposals that will be properly pinned to IPFS.');
  } else {
    console.error('\nIPFS configuration test failed.');
    console.info('Please check your credentials and try again.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}