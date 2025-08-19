import { input, select, confirm } from '@inquirer/prompts';
import { WalletClient } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import { createProposal, ProposalMetadata, ProposalAction, encodeAction } from './createProposal';
import { ABIs } from '../../../abi';

export async function createProposalPrompt(
  config: INetworkConfig,
  walletClient: WalletClient
): Promise<void> {
  try {
    console.info('\n📝 Create a New Proposal\n');

    // Select proposal type
    const proposalType = await select({
      message: 'What type of proposal would you like to create?',
      choices: [
        {
          name: 'Standard Proposal - Goes through the normal governance process',
          value: 'standard',
        },
        {
          name: 'Emergency Proposal - For urgent matters requiring immediate action',
          value: 'emergency',
        },
        {
          name: 'Cancel',
          value: 'cancel',
        },
      ],
    });

    if (proposalType === 'cancel') {
      console.info('Proposal creation cancelled.');
      return;
    }

    // Collect metadata
    console.info('\n--- Proposal Metadata ---\n');
    
    const title = await input({
      message: 'Proposal title:',
      validate: (value) => {
        if (value.trim().length < 3) {
          return 'Title must be at least 3 characters long';
        }
        return true;
      },
    });

    const summary = await input({
      message: 'Short summary (one line):',
      validate: (value) => {
        if (value.trim().length < 10) {
          return 'Summary must be at least 10 characters long';
        }
        return true;
      },
    });

    const description = await input({
      message: 'Detailed description:',
      validate: (value) => {
        if (value.trim().length < 20) {
          return 'Description must be at least 20 characters long';
        }
        return true;
      },
    });

    // Ask about resources
    const hasResources = await confirm({
      message: 'Do you want to add any resource links (e.g., forum discussions, documents)?',
      default: false,
    });

    const resources = [];
    if (hasResources) {
      let addMore = true;
      while (addMore) {
        const resourceName = await input({
          message: 'Resource name:',
        });
        const resourceUrl = await input({
          message: 'Resource URL:',
          validate: (value) => {
            try {
              new URL(value);
              return true;
            } catch {
              return 'Please enter a valid URL';
            }
          },
        });
        resources.push({ name: resourceName, url: resourceUrl });
        
        addMore = await confirm({
          message: 'Add another resource?',
          default: false,
        });
      }
    }

    const metadata: ProposalMetadata = {
      title,
      summary,
      description,
      resources: resources.length > 0 ? resources : undefined,
    };

    // Ask about actions
    console.info('\n--- Proposal Actions ---\n');
    const hasActions = await confirm({
      message: 'Does this proposal require on-chain actions (e.g., contract calls, fund transfers)?',
      default: false,
    });

    const actions: ProposalAction[] = [];
    if (hasActions) {
      let addMore = true;
      while (addMore) {
        const actionType = await select({
          message: 'What type of action?',
          choices: [
            {
              name: 'Transfer funds',
              value: 'transfer',
            },
            {
              name: 'Contract function call',
              value: 'contract',
            },
            {
              name: 'Raw transaction data',
              value: 'raw',
            },
          ],
        });

        if (actionType === 'transfer') {
          const to = await input({
            message: 'Recipient address:',
            validate: (value) => {
              if (!value.match(/^0x[a-fA-F0-9]{40}$/)) {
                return 'Please enter a valid Ethereum address';
              }
              return true;
            },
          });

          const amount = await input({
            message: 'Amount in ETH:',
            validate: (value) => {
              const num = parseFloat(value);
              if (isNaN(num) || num <= 0) {
                return 'Please enter a valid positive number';
              }
              return true;
            },
          });

          actions.push({
            to: to as `0x${string}`,
            value: BigInt(Math.floor(parseFloat(amount) * 1e18)),
            data: '0x' as `0x${string}`,
          });
        } else if (actionType === 'contract') {
          const contractType = await select({
            message: 'Which contract?',
            choices: Object.entries(config.contracts).map(([name, address]) => ({
              name: `${name} (${address})`,
              value: name,
            })),
          });

          const contractAddress = config.contracts[contractType as keyof typeof config.contracts];
          const abi = ABIs[contractType as keyof typeof ABIs];

          const writeFunctions = abi.filter(
            (item: any) => item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure'
          );

          const functionName = await select({
            message: 'Select function to call:',
            choices: writeFunctions.map((func: any) => ({
              name: `${func.name}(${func.inputs.map((i: any) => i.type).join(', ')})`,
              value: func.name,
            })),
          });

          const selectedFunction = writeFunctions.find((f: any) => f.name === functionName);
          const args = [];

          if (selectedFunction && selectedFunction.inputs.length > 0) {
            console.info('\nEnter function parameters:');
            for (const paramInput of selectedFunction.inputs) {
              const value = await input({
                message: `${paramInput.name} (${paramInput.type}):`,
                validate: (val) => {
                  if (val.trim() === '') {
                    return 'This field cannot be empty';
                  }
                  return true;
                },
              });
              
              // Convert value based on type
              if (paramInput.type.includes('uint') || paramInput.type.includes('int')) {
                args.push(BigInt(value));
              } else if (paramInput.type === 'bool') {
                args.push(value.toLowerCase() === 'true');
              } else {
                args.push(value);
              }
            }
          }

          const action = encodeAction(
            contractAddress,
            abi,
            functionName,
            args
          );
          actions.push(action);
        } else if (actionType === 'raw') {
          const to = await input({
            message: 'Target address:',
            validate: (value) => {
              if (!value.match(/^0x[a-fA-F0-9]{40}$/)) {
                return 'Please enter a valid Ethereum address';
              }
              return true;
            },
          });

          const value = await input({
            message: 'Value in ETH (or 0):',
            default: '0',
            validate: (val) => {
              const num = parseFloat(val);
              if (isNaN(num) || num < 0) {
                return 'Please enter a valid non-negative number';
              }
              return true;
            },
          });

          const data = await input({
            message: 'Transaction data (0x...):',
            default: '0x',
            validate: (val) => {
              if (!val.match(/^0x[a-fA-F0-9]*$/)) {
                return 'Please enter valid hex data starting with 0x';
              }
              return true;
            },
          });

          actions.push({
            to: to as `0x${string}`,
            value: BigInt(Math.floor(parseFloat(value) * 1e18)),
            data: data as `0x${string}`,
          });
        }

        addMore = await confirm({
          message: 'Add another action?',
          default: false,
        });
      }
    }

    // Destination plugin selection
    let destinationPlugin = null;
    if (proposalType === 'standard') {
      const useDefaultDestination = await confirm({
        message: 'Use default destination (OptimisticTokenVotingPlugin)?',
        default: true,
      });

      if (!useDefaultDestination) {
        destinationPlugin = await input({
          message: 'Enter destination plugin address:',
          validate: (value) => {
            if (!value.match(/^0x[a-fA-F0-9]{40}$/)) {
              return 'Please enter a valid Ethereum address';
            }
            return true;
          },
        }) as `0x${string}`;
      }
    }

    // Auto-approve option
    const autoApprove = await confirm({
      message: 'Do you want to automatically approve this proposal after creation?',
      default: true,
    });

    // Summary before submission
    console.info('\n--- Proposal Summary ---');
    console.info(`Type: ${proposalType === 'emergency' ? '🚨 Emergency' : '📋 Standard'}`);
    if (proposalType === 'emergency') {
      console.info('🔐 Proposal will be encrypted for Security Council members');
    }
    console.info(`Title: ${metadata.title}`);
    console.info(`Summary: ${metadata.summary}`);
    console.info(`Description: ${metadata.description}`);
    if (metadata.resources && metadata.resources.length > 0) {
      console.info(`Resources: ${metadata.resources.length} link(s)`);
    }
    console.info(`Actions: ${actions.length} action(s)`);
    console.info(`Auto-approve: ${autoApprove ? 'Yes' : 'No'}`);

    const confirmSubmit = await confirm({
      message: '\nDo you want to submit this proposal?',
      default: false,
    });

    if (!confirmSubmit) {
      console.info('Proposal creation cancelled.');
      return;
    }

    // Create the proposal
    console.info('\n🔄 Creating proposal...');
    const publicClient = getPublicClient(config);
    
    const txHash = await createProposal(
      config,
      walletClient,
      publicClient,
      metadata,
      actions,
      destinationPlugin,
      autoApprove,
      proposalType as 'standard' | 'emergency'
    );

    console.info(`\n✅ Proposal created successfully!`);
    console.info(`Transaction hash: ${txHash}`);
    console.info(`View on explorer: ${config.urls.explorer}tx/${txHash}`);

  } catch (error) {
    console.error('\n❌ Failed to create proposal:', error);
    throw error;
  }
}