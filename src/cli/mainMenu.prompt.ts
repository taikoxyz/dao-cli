import { select, input } from '@inquirer/prompts';
import { INetworkConfig } from '../types/network.type';
import getSecurityCouncilMembers from '../api/dao/security-council/getSecurityCouncilMembers';
import isSecurityCouncilMember from '../api/dao/security-council/isAppointedAgent';
import { isAddressEqual, WalletClient } from 'viem';
import getStandardProposals from '../api/dao/standard-proposal/getStandardProposals';
import getEmergencyProposals from '../api/dao/emergency-proposal/getEmergencyProposals';
import getPublicProposals from '../api/dao/public-proposal/getPublicProposals';
import getDelegates, { getDelegateCount, getDelegate } from '../api/dao/delegates/getDelegates';
import { manageDelegateProfilePrompt } from '../api/dao/delegates/manageDelegateProfile.prompt';
import { ABIs } from '../abi';
import { getPublicClient } from '../api/viem';
import { createProposalPrompt } from '../api/dao/security-council/createProposal.prompt';
import { proposalActionsPrompt } from '../api/dao/security-council/proposalActions.prompt';

export async function selectMainMenuPrompt(config: INetworkConfig, walletClient: WalletClient): Promise<void> {
  const address = walletClient.account?.address as `0x${string}`;
  const selected = await select({
    message: 'Welcome to the DAO CLI. What module would you like to use?',
    choices: [
      {
        value: 'Public Stage Proposals',
      },
      {
        value: 'Security Council',
      },
      {
        value: 'Delegates',
      },
      {
        value: 'Read Bare Contracts',
      },
      {
        value: 'Exit',
      },
    ],
  });

  if (selected === 'Public Stage Proposals') {
    try {
      const proposals = (await getPublicProposals(config)) || [];
      if (proposals.length === 0) {
        console.info('No public stage proposals found.');
        return selectMainMenuPrompt(config, walletClient);
      }
      const proposalSelect = await select({
        message: 'Select a public stage proposal to view details:',
        choices: proposals.map((proposal, index) => ({
          name: `Proposal #${index + 1}: ${proposal.title}`,
          value: index,
        })),
      });
      const selectedProposal = proposals[proposalSelect];
      console.info(selectedProposal);
    } catch (error) {
      console.error('Error fetching public proposals:');
      console.error(error instanceof Error ? error.message : error);
      console.info('Returning to main menu...');
    }
  }

  if (selected === 'Security Council') {
    try {
      // fetch sidebar details
      // fetch SC members
      const members = await getSecurityCouncilMembers(config);
      console.info(`Security Council Members:`);
      console.table(members);
      const isEnvAccountAppointedAgent = await isSecurityCouncilMember(address, config);
      if (isEnvAccountAppointedAgent) {
        console.info(`Your account (${address}) is an appointed agent of the Security Council.`);

        const nextAction = await select({
          message: 'What would you like to do as a Security Council member?',
          choices: [
            { value: 'Create New Proposal' },
            { value: 'Approve/Execute Proposals' },
            { value: 'View Standard Proposals' },
            { value: 'View Emergency Proposals' },
          ],
        });

        if (nextAction === 'Create New Proposal') {
          await createProposalPrompt(config, walletClient);
        } else if (nextAction === 'Approve/Execute Proposals') {
          await proposalActionsPrompt(config, walletClient);
        } else if (nextAction === 'View Standard Proposals') {
          const proposals = (await getStandardProposals(config)) || [];
          const proposalSelect = await select({
            message: 'Select a standard proposal to view details:',
            choices: proposals.map((proposal, index) => ({
              name: `Proposal #${index + 1}: ${proposal.title}`,
              value: index,
            })),
          });
          console.info(proposals[proposalSelect]);
        } else if (nextAction === 'View Emergency Proposals') {
          const proposals = (await getEmergencyProposals(config)) || [];

          const proposalSelect = await select({
            message: 'Select an emergency proposal to view details:',
            choices: proposals.map((proposal, index) => ({
              name: `Proposal #${index + 1}: ${proposal?.title}`,
              value: index,
            })),
          });
          console.info(proposals[proposalSelect]);
        } else {
          console.error(`Invalid action selected: ${nextAction}`);
        }
      } else {
        console.info(`Your account (${address}) is NOT an appointed agent of the Security Council.`);
        console.info(
          'Please check your .env file and ensure you have the correct MAINNET_PRIVATE_KEY or HOLESKY_PRIVATE_KEY set.',
        );
      }
    } catch (error) {
      console.error('Error accessing Security Council information:');
      console.error(error instanceof Error ? error.message : error);
      console.info('\nThis could be due to:');
      console.info('- Network connectivity issues');
      console.info('- Invalid private key in .env file');
      console.info('- Contract deployment issues');
      console.info('\nReturning to main menu...');
    }
  }

  if (selected === 'Delegates') {
    try {
      const delegateAction = await select({
        message: 'What would you like to do?',
        choices: [
          { value: 'View Delegates', name: 'View Delegates List' },
          { value: 'Manage Profile', name: 'Create/Update My Delegate Profile' },
        ],
      });

      if (delegateAction === 'View Delegates') {
        console.info('Fetching delegates from DelegationWall contract...');

        const delegateCount = await getDelegateCount(config);
        console.info(`\nTotal registered delegates: ${delegateCount}`);

        const delegates = await getDelegates(config);

        if (delegates.length === 0) {
          console.info('No delegates have registered yet.');
        } else {
          const delegateSelect = await select({
            message: 'Select a delegate to view details:',
            choices: delegates.map((delegate) => {
              // Build display name with identifier and full address
              const identifier = delegate.identifier || 'Unnamed Delegate';
              const displayName = `${identifier} - ${delegate.address}`;
              return {
                name: displayName,
                value: delegate.address,
              };
            }),
          });

          // Fetch full details including voting power for selected delegate
          console.info('\nFetching delegate details and voting power...');
          const fullProfile = await getDelegate(delegateSelect, config, true);

          if (fullProfile) {
            console.info('\n--- Delegate Profile ---');
            console.info(`Identifier: ${fullProfile.identifier || 'Not specified'}`);
            console.info(`Address: ${fullProfile.address}`);
            console.info(`Content URL: ${fullProfile.contentUrl}`);

            // Display voting power
            if (fullProfile.votingPower !== undefined) {
              const votingPowerFormatted = (Number(fullProfile.votingPower) / 1e18).toFixed(4);
              const tokenBalanceFormatted = (Number(fullProfile.tokenBalance || 0n) / 1e18).toFixed(4);
              console.info(`\n--- Voting Power ---`);
              console.info(`Total Voting Power: ${votingPowerFormatted} votes`);
              console.info(`Token Balance: ${tokenBalanceFormatted} tokens`);
            }

            if (fullProfile.metadata) {
              console.info('\n--- Full Metadata ---');
              console.info(JSON.stringify(fullProfile.metadata, null, 2));
            }
          } else {
            console.error('Failed to fetch delegate details.');
          }
        }
      } else if (delegateAction === 'Manage Profile') {
        await manageDelegateProfilePrompt(config, walletClient);
      }
    } catch (error) {
      console.error('Error in Delegates module:');
      console.error(error instanceof Error ? error.message : error);
      console.info('Returning to main menu...');
    }
  }

  if (selected === 'Read Bare Contracts') {
    try {
      const selectedContract = await select({
        message: 'Select a contract to read:',
        choices: Object.entries(config.contracts).map(([name, address]) => ({
          name: `${name} (${address})`,
          value: address,
        })),
      });
      const contractName = Object.entries(config.contracts).find(([, address]) =>
        isAddressEqual(address, selectedContract),
      )?.[0];
      const selectedMethod = await select({
        message: `Select a method to call on contract ${selectedContract}:`,
        choices: ABIs[contractName as keyof typeof ABIs]
          .filter((item) => item.type === 'function' && item.stateMutability === 'view')
          .map((item) => ({
            name: `${item.name} (${item.inputs.map((i: { name: string }) => i.name).join(', ')})`,
            value: item.name,
          })),
      });

      const method = ABIs[contractName as keyof typeof ABIs].find(
        (item) => item.name === selectedMethod && item.type === 'function',
      );
      const parameters = [];

      // time to input the parameters, if any
      if (method && method.inputs.length) {
        for (const _input of method.inputs) {
          const value = await input({
            message: `Enter value for ${_input.name} (${_input.type}):`,
            validate: (inputValue: string) => {
              if (inputValue.trim() === '') {
                return 'This field cannot be empty.';
              }
              // Add more validation logic based on input type if needed
              return true;
            },
          });
          parameters.push(value);
        }
      }

      const publicClient = getPublicClient(config);
      const res = await publicClient.readContract({
        address: selectedContract,
        abi: ABIs[contractName as keyof typeof ABIs],
        functionName: selectedMethod,
        args: parameters,
      });
      console.info(`Result of calling ${selectedMethod} on ${contractName} at address ${selectedContract}:`, res);
    } catch (error) {
      console.error('Error reading contract:');
      console.error(error instanceof Error ? error.message : error);
      console.info('Returning to main menu...');
    }
  }

  if (selected === 'Exit') {
    process.exit(0);
  }
  console.info(`You selected: ${selected}`);
  return selectMainMenuPrompt(config, walletClient);
}
