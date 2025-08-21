import { input, confirm, select } from '@inquirer/prompts';
import { WalletClient, isAddress } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { getCurrentDelegation, delegateVotingPower, selfDelegate } from './delegateVotingPower';
import getDelegates, { getDelegate } from './getDelegates';

export async function delegateVotingPowerPrompt(config: INetworkConfig, walletClient: WalletClient): Promise<void> {
  try {
    if (!walletClient.account) {
      console.error('No wallet account found. Please check your configuration.');
      return;
    }

    const myAddress = walletClient.account.address;
    console.info(`\n🗳️ Voting Power Delegation`);
    console.info(`Your address: ${myAddress}`);

    // Get current delegation info
    console.info('\nFetching your current delegation status...');
    const currentInfo = await getCurrentDelegation(myAddress, config);

    // Display current status
    console.info('\n--- Current Status ---');
    if (currentInfo.tokenBalance === 0n) {
      console.error('❌ You have no voting tokens.');
      console.error('You need to hold tokens to delegate voting power.');
      return;
    }

    const tokenBalanceFormatted = (Number(currentInfo.tokenBalance) / 1e18).toFixed(4);
    const votingPowerFormatted = (Number(currentInfo.votingPower) / 1e18).toFixed(4);

    console.info(`Token Balance: ${tokenBalanceFormatted} tokens`);
    console.info(`Current Voting Power: ${votingPowerFormatted} votes`);

    if (currentInfo.currentDelegate) {
      if (currentInfo.currentDelegate === myAddress) {
        console.info(`Current Delegation: Self-delegated ✓`);
      } else {
        console.info(`Currently Delegating To: ${currentInfo.currentDelegate}`);

        // Try to get delegate info
        const delegateProfile = await getDelegate(currentInfo.currentDelegate, config, false);
        if (delegateProfile && delegateProfile.identifier) {
          console.info(`  Delegate Name: ${delegateProfile.identifier}`);
        }
      }
    } else {
      console.warn('⚠️ Not delegating to anyone (voting power inactive)');
      console.info('Note: You must delegate to activate your voting power, even if delegating to yourself.');
    }

    // Ask what they want to do
    const action = await select({
      message: '\nWhat would you like to do?',
      choices: [
        {
          value: 'delegate-to-registered',
          name: 'Delegate to a registered delegate',
          description: 'Choose from the list of registered delegates',
        },
        {
          value: 'delegate-to-address',
          name: 'Delegate to a specific address',
          description: 'Enter any Ethereum address to delegate to',
        },
        {
          value: 'self-delegate',
          name: 'Self-delegate (keep voting power)',
          description: 'Delegate to yourself to activate and retain your voting power',
        },
        {
          value: 'cancel',
          name: 'Cancel',
        },
      ],
    });

    if (action === 'cancel') {
      console.info('Delegation cancelled.');
      return;
    }

    let targetAddress: string | null = null;

    if (action === 'self-delegate') {
      targetAddress = myAddress;
      console.info('\n📝 You are about to self-delegate your voting power.');
      console.info('This will activate your voting power while keeping it under your control.');
    } else if (action === 'delegate-to-registered') {
      // Fetch registered delegates
      console.info('\nFetching registered delegates...');
      const delegates = await getDelegates(config);

      if (delegates.length === 0) {
        console.info('No registered delegates found.');
        return;
      }

      // Filter out self from the list
      const otherDelegates = delegates.filter((d) => d.address.toLowerCase() !== myAddress.toLowerCase());

      if (otherDelegates.length === 0) {
        console.info('No other delegates found. You can self-delegate or delegate to a specific address.');
        return;
      }

      // Let user select a delegate
      const selectedDelegate = await select({
        message: 'Select a delegate:',
        choices: otherDelegates.map((delegate) => {
          const identifier = delegate.identifier || 'Unnamed Delegate';
          return {
            name: `${identifier} - ${delegate.address}`,
            value: delegate.address,
            description:
              delegate.metadata && typeof delegate.metadata === 'object'
                ? ((delegate.metadata as Record<string, unknown>).statement as string) ||
                  ((delegate.metadata as Record<string, unknown>).description as string) ||
                  ''
                : '',
          };
        }),
      });

      targetAddress = selectedDelegate;

      // Show selected delegate details
      const selectedProfile = await getDelegate(selectedDelegate, config, true);
      if (selectedProfile) {
        console.info('\n--- Selected Delegate ---');
        console.info(`Address: ${selectedProfile.address}`);
        if (selectedProfile.identifier) {
          console.info(`Name: ${selectedProfile.identifier}`);
        }
        if (selectedProfile.votingPower !== undefined) {
          const votingPowerFormatted = (Number(selectedProfile.votingPower) / 1e18).toFixed(4);
          console.info(`Current Voting Power: ${votingPowerFormatted} votes`);
        }
        if (selectedProfile.metadata && typeof selectedProfile.metadata === 'object') {
          const metadata = selectedProfile.metadata as Record<string, unknown>;
          if (metadata.statement) {
            console.info(`\nDelegation Statement:`);
            console.info(metadata.statement as string);
          }
        }
      }
    } else if (action === 'delegate-to-address') {
      // Ask for specific address
      const inputAddress = await input({
        message: 'Enter the address to delegate to:',
        validate: (value) => {
          if (!value.trim()) {
            return 'Address is required';
          }
          if (!isAddress(value)) {
            return 'Invalid Ethereum address';
          }
          return true;
        },
      });

      targetAddress = inputAddress.trim();

      // Check if this is a registered delegate
      const delegateProfile = await getDelegate(targetAddress as `0x${string}`, config, true);
      if (delegateProfile) {
        console.info('\n✅ This is a registered delegate!');
        console.info(`Name: ${delegateProfile.identifier || 'Unnamed'}`);
        if (delegateProfile.votingPower !== undefined) {
          const votingPowerFormatted = (Number(delegateProfile.votingPower) / 1e18).toFixed(4);
          console.info(`Current Voting Power: ${votingPowerFormatted} votes`);
        }
      } else {
        console.info('\nℹ️ This address is not a registered delegate.');
        console.info('You can still delegate to them, but they may not be actively participating in governance.');
      }
    }

    if (!targetAddress) {
      console.error('No target address selected.');
      return;
    }

    // Confirm delegation
    console.info('\n--- Delegation Summary ---');
    console.info(`From: ${myAddress}`);
    console.info(`To: ${targetAddress}`);
    console.info(`Token Balance to Delegate: ${tokenBalanceFormatted} tokens`);

    const shouldProceed = await confirm({
      message: '\nDo you want to proceed with this delegation?',
      default: true,
    });

    if (!shouldProceed) {
      console.info('Delegation cancelled.');
      return;
    }

    // Execute delegation
    let result;
    if (targetAddress === myAddress) {
      result = await selfDelegate(config, walletClient);
    } else {
      result = await delegateVotingPower(targetAddress as `0x${string}`, config, walletClient);
    }

    if (result.success) {
      console.info('\n✅ Delegation successful!');
      console.info(`Transaction hash: ${result.txHash}`);
      console.info('\nYour voting power has been delegated successfully.');
      console.info('The delegation will be active for all future proposals.');
    } else {
      console.error('\n❌ Delegation failed');
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('\n❌ An error occurred:');
    console.error(error instanceof Error ? error.message : error);
  }
}
