import { select, input } from '@inquirer/prompts';
import { INetworkConfig } from '../types/network.type';
import getSecurityCouncilMembers from '../api/dao/security-council/getSecurityCouncilMembers';
import isSecurityCouncilMember from '../api/dao/security-council/isAppointedAgent';
import { isAddressEqual, WalletClient } from 'viem';
import getStandardProposal from '../api/dao/standard-proposal/getStandardProposal';
import getStandardProposals from '../api/dao/standard-proposal/getStandardProposals';
import getEmergencyProposals from '../api/dao/emergency-proposal/getEmergencyProposals';
import { decrypt } from '../api/dao/security-council/getDecryptionKey';
import getPublicProposals from '../api/dao/public-proposal/getPublicProposals';
import { ABIs } from '../abi';
import { getPublicClient } from '../api/viem';

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
    console.info('To Do: Fetch the list of public stage proposals');
    const proposals = (await getPublicProposals(config)) || [];
    const proposalSelect = await select({
      message: 'Select a public stage proposal to view details:',
      choices: proposals.map((proposal, index) => ({
        name: `Proposal #${index + 1}: ${proposal.title}`,
        value: index,
      })),
    });
    const selectedProposal = proposals[proposalSelect];
    console.info(selectedProposal);
  }

  if (selected === 'Security Council') {
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
        choices: [{ value: 'View Standard Proposals' }, { value: 'View Emergency Proposals' }],
      });

      if (nextAction === 'View Standard Proposals') {
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
        const decryptedProposals = [];
        for (const proposal of proposals) {
          const decrypted = await decrypt(config, proposal as any);
          decryptedProposals.push(decrypted);
        }

        const proposalSelect = await select({
          message: 'Select a standard proposal to view details:',
          choices: decryptedProposals.map((proposal, index) => ({
            name: `Proposal #${index + 1}: ${proposal?.title}`,
            value: index,
          })),
        });
        console.info(decryptedProposals[proposalSelect]);
      } else {
        console.error(`Invalid action selected: ${nextAction}`);
      }
    } else {
      console.info(`Your account (${address}) is NOT an appointed agent of the Security Council.`);
    }
  }

  if (selected === 'Delegates') {
    console.info('To Do: Fetch the list of delegates');
  }

  if (selected === 'Read Bare Contracts') {
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
          name: `${item.name} (${item.inputs.map((i: any) => i.name).join(', ')})`,
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
  }

  if (selected === 'Exit') {
    process.exit(0);
  }
  console.info(`You selected: ${selected}`);
  return selectMainMenuPrompt(config, walletClient);
}
