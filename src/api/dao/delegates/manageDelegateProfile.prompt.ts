import { input, confirm } from '@inquirer/prompts';
import { WalletClient } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import {
  checkDelegateProfileExists,
  createOrUpdateDelegateProfile,
  fetchCurrentProfileForEdit,
  DelegateProfileData,
} from './manageDelegateProfile';

export async function manageDelegateProfilePrompt(config: INetworkConfig, walletClient: WalletClient): Promise<void> {
  try {
    const address = walletClient.account?.address;
    if (!address) {
      console.error('No wallet address found. Please check your configuration.');
      return;
    }

    console.info(`\nChecking delegate profile for address: ${address}`);

    // Check if profile exists
    const profileInfo = await checkDelegateProfileExists(address, config);

    if (profileInfo.exists) {
      console.info('\n✅ You already have a delegate profile registered.');
      console.info(`Current IPFS URL: ${profileInfo.contentUrl}`);

      if (profileInfo.metadata) {
        console.info('\nCurrent profile data:');
        console.info(JSON.stringify(profileInfo.metadata, null, 2));
      }

      const shouldUpdate = await confirm({
        message: 'Would you like to update your existing profile?',
        default: true,
      });

      if (!shouldUpdate) {
        console.info('Profile update cancelled.');
        return;
      }
    } else {
      console.info("\n📝 No delegate profile found. Let's create one!");
    }

    // Fetch existing data if updating
    const existingData = profileInfo.exists ? await fetchCurrentProfileForEdit(address, config) : null;

    // Collect profile information
    console.info('\n--- Delegate Profile Information ---');
    console.info('Please provide the following information for your delegate profile:');

    const identifier = await input({
      message: 'Identifier/Username (required):',
      default: existingData?.identifier || '',
      validate: (value) => {
        if (!value.trim()) {
          return 'Identifier is required';
        }
        return true;
      },
    });

    const name = await input({
      message: 'Full Name (optional):',
      default: existingData?.name || '',
    });

    const description = await input({
      message: 'Description/Bio (optional):',
      default: existingData?.description || '',
    });

    const statement = await input({
      message: 'Delegation Statement (optional - why should people delegate to you?):',
      default: existingData?.statement || '',
    });

    const website = await input({
      message: 'Website URL (optional):',
      default: existingData?.website || '',
    });

    const twitter = await input({
      message: 'Twitter/X handle (optional):',
      default: existingData?.twitter || '',
    });

    const discord = await input({
      message: 'Discord username (optional):',
      default: existingData?.discord || '',
    });

    const email = await input({
      message: 'Contact email (optional):',
      default: existingData?.email || '',
    });

    const interestsInput = await input({
      message: 'Areas of interest (comma-separated, optional):',
      default: existingData?.interests?.join(', ') || '',
    });

    const interests = interestsInput
      ? interestsInput
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    // Build profile data object
    const profileData: DelegateProfileData = {
      identifier,
      ...(name && { name }),
      ...(description && { description }),
      ...(statement && { statement }),
      ...(website && { website }),
      ...(twitter && { twitter }),
      ...(discord && { discord }),
      ...(email && { email }),
      ...(interests.length > 0 && { interests }),
      address, // Include the delegate's address in the metadata
      updatedAt: new Date().toISOString(),
    };

    // Show preview
    console.info('\n--- Profile Preview ---');
    console.info(JSON.stringify(profileData, null, 2));

    const shouldProceed = await confirm({
      message: '\nDo you want to submit this profile to the blockchain?',
      default: true,
    });

    if (!shouldProceed) {
      console.info('Profile creation/update cancelled.');
      return;
    }

    // Check for PINATA_JWT
    if (!process.env.PINATA_JWT) {
      console.error('\n❌ IPFS pinning not configured.');
      console.error('Please set PINATA_JWT in your .env file.');
      console.error('Get your JWT from https://app.pinata.cloud/developers/api-keys');
      return;
    }

    console.info('\n🚀 Submitting profile...');

    // Create or update the profile
    const result = await createOrUpdateDelegateProfile(profileData, config, walletClient);

    if (result.success) {
      console.info('\n✅ Success!');
      console.info(`Transaction hash: ${result.txHash}`);
      console.info(`IPFS hash: ${result.ipfsHash}`);
      console.info(`IPFS URL: ipfs://${result.ipfsHash}`);
      console.info('\nYour delegate profile has been successfully registered/updated!');
      console.info('It may take a few moments for the changes to be reflected on-chain.');
    } else {
      console.error('\n❌ Failed to create/update profile');
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('\n❌ An error occurred:');
    console.error(error instanceof Error ? error.message : error);
  }
}

