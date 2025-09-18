import { select, confirm } from '@inquirer/prompts';
import { WalletClient, PublicClient } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import { approveStandardProposal, approveEmergencyProposal } from './approveProposal';
import { executeStandardProposal, executeEmergencyProposal } from './executeProposal';
import getStandardProposals from '../standard-proposal/getStandardProposals';
import getEmergencyProposals from '../emergency-proposal/getEmergencyProposals';

export async function proposalActionsPrompt(config: INetworkConfig, walletClient: WalletClient): Promise<void> {
  try {
    console.info('\n📋 Proposal Management\n');

    const actionType = await select({
      message: 'What would you like to do?',
      choices: [
        {
          name: 'Approve Standard Proposal',
          value: 'approve-standard',
        },
        {
          name: 'Approve Emergency Proposal',
          value: 'approve-emergency',
        },
        {
          name: 'Execute Standard Proposal',
          value: 'execute-standard',
        },
        {
          name: 'Execute Emergency Proposal',
          value: 'execute-emergency',
        },
        {
          name: 'Back to Security Council Menu',
          value: 'back',
        },
      ],
    });

    if (actionType === 'back') {
      return;
    }

    const publicClient = getPublicClient(config);

    if (actionType === 'approve-standard') {
      await handleApproveStandard(config, walletClient, publicClient);
    } else if (actionType === 'approve-emergency') {
      await handleApproveEmergency(config, walletClient, publicClient);
    } else if (actionType === 'execute-standard') {
      await handleExecuteStandard(config, walletClient, publicClient);
    } else if (actionType === 'execute-emergency') {
      await handleExecuteEmergency(config, walletClient, publicClient);
    }
  } catch (error) {
    console.error('\n❌ Error in proposal actions:', error);
    throw error;
  }
}

async function handleApproveStandard(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
): Promise<void> {
  try {
    // Get standard proposals
    const proposals = (await getStandardProposals(config)) || [];

    if (proposals.length === 0) {
      console.info('No standard proposals found.');
      return;
    }

    // Filter out executed proposals
    const activeProposals = proposals.filter((p) => !p.executed);

    if (activeProposals.length === 0) {
      console.info('No active standard proposals found (all are executed).');
      return;
    }

    const proposalSelect = await select({
      message: 'Select a standard proposal to approve:',
      choices: activeProposals.map((proposal, index) => ({
        name: `- #${index + 1}[ID:${proposal.proposalId}] ${proposal.title} (${proposal.approvals} approvals)`,
        value: proposal.proposalId,
      })),
    });

    console.info('\n--- Proposal Details ---');
    const selectedProposal = proposals.find((p) => p.proposalId === proposalSelect);
    if (selectedProposal) {
      console.info(`Title: ${selectedProposal.title}`);
      console.info(`Current Approvals: ${selectedProposal.approvals}`);
      console.info(`Executed: ${selectedProposal.executed ? 'Yes' : 'No'}`);
    }

    const confirmApproval = await confirm({
      message: `\nConfirm approval of proposal ${proposalSelect}?`,
      default: false,
    });

    if (!confirmApproval) {
      console.info('Approval cancelled.');
      return;
    }

    const txHash = await approveStandardProposal(config, walletClient, publicClient, proposalSelect);

    console.info(`\n✅ Standard proposal approved successfully!`);
    console.info(`Transaction hash: ${txHash}`);
    console.info(`View on explorer: ${config.urls.explorer}tx/${txHash}`);
  } catch (error) {
    console.error('Failed to approve standard proposal:', error);
    throw error;
  }
}

async function handleApproveEmergency(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
): Promise<void> {
  try {
    // Get emergency proposals
    const proposals = (await getEmergencyProposals(config)) || [];

    if (proposals.length === 0) {
      console.info('No emergency proposals found.');
      return;
    }

    // Filter out executed proposals
    const activeProposals = proposals.filter((p) => !p.executed);

    if (activeProposals.length === 0) {
      console.info('No active emergency proposals found (all are executed).');
      return;
    }

    const proposalSelect = await select({
      message: 'Select an emergency proposal to approve:',
      choices: activeProposals.map((proposal, index) => ({
        name: `- #${index + 1}[ID:${proposal.proposalId}] ${proposal.title || '[Encrypted]'} (${proposal.approvals} approvals)`,
        value: proposal.proposalId,
      })),
    });

    console.info('\n--- Proposal Details ---');
    const selectedProposal = proposals.find((p) => p.proposalId === proposalSelect);
    if (selectedProposal) {
      console.info(`Title: ${selectedProposal.title || '[Encrypted - requires decryption]'}`);
      console.info(`Current Approvals: ${selectedProposal.approvals}`);
      console.info(`Executed: ${selectedProposal.executed ? 'Yes' : 'No'}`);
    }

    const confirmApproval = await confirm({
      message: `\nConfirm approval of emergency proposal ${proposalSelect}?`,
      default: false,
    });

    if (!confirmApproval) {
      console.info('Approval cancelled.');
      return;
    }

    const txHash = await approveEmergencyProposal(config, walletClient, publicClient, proposalSelect);

    console.info(`\n✅ Emergency proposal approved successfully!`);
    console.info(`Transaction hash: ${txHash}`);
    console.info(`View on explorer: ${config.urls.explorer}tx/${txHash}`);
  } catch (error) {
    console.error('Failed to approve emergency proposal:', error);
    throw error;
  }
}

async function handleExecuteStandard(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
): Promise<void> {
  try {
    // Get standard proposals
    const proposals = (await getStandardProposals(config)) || [];

    if (proposals.length === 0) {
      console.info('No standard proposals found.');
      return;
    }

    // Filter to only non-executed proposals
    const activeProposals = proposals.filter((p) => !p.executed);

    if (activeProposals.length === 0) {
      console.info('No executable standard proposals found (all are executed).');
      return;
    }

    const proposalSelect = await select({
      message: 'Select a standard proposal to execute:',
      choices: activeProposals.map((proposal, index) => ({
        name: `- #${index + 1}[ID:${proposal.proposalId}] ${proposal.title} (${proposal.approvals} approvals)`,
        value: proposal.proposalId,
      })),
    });

    console.info('\n--- Proposal Details ---');
    const selectedProposal = proposals.find((p) => p.proposalId === proposalSelect);
    if (selectedProposal) {
      console.info(`Title: ${selectedProposal.title}`);
      console.info(`Current Approvals: ${selectedProposal.approvals}`);
      console.info(`Executed: ${selectedProposal.executed ? 'Yes' : 'No'}`);
    }

    const confirmExecution = await confirm({
      message: `\nConfirm execution of proposal ${proposalSelect}?`,
      default: false,
    });

    if (!confirmExecution) {
      console.info('Execution cancelled.');
      return;
    }

    const txHash = await executeStandardProposal(config, walletClient, publicClient, proposalSelect);

    console.info(`\n✅ Standard proposal executed successfully!`);
    console.info(`Transaction hash: ${txHash}`);
    console.info(`View on explorer: ${config.urls.explorer}tx/${txHash}`);
  } catch (error) {
    console.error('Failed to execute standard proposal:', error);
    throw error;
  }
}

async function handleExecuteEmergency(
  config: INetworkConfig,
  walletClient: WalletClient,
  publicClient: PublicClient,
): Promise<void> {
  try {
    // Get emergency proposals
    const proposals = (await getEmergencyProposals(config)) || [];

    if (proposals.length === 0) {
      console.info('No emergency proposals found.');
      return;
    }

    // Filter to only non-executed proposals
    const activeProposals = proposals.filter((p) => !p.executed);

    if (activeProposals.length === 0) {
      console.info('No executable emergency proposals found (all are executed).');
      return;
    }

    const proposalSelect = await select({
      message: 'Select an emergency proposal to execute:',
      choices: activeProposals.map((proposal, index) => ({
        name: `- #${index + 1}[ID:${proposal.proposalId}] ${proposal.title || '[Encrypted]'} (${proposal.approvals} approvals)`,
        value: proposal.proposalId,
      })),
    });

    console.info('\n--- Proposal Details ---');
    const selectedProposal = proposals.find((p) => p.proposalId === proposalSelect);
    if (selectedProposal) {
      console.info(`Title: ${selectedProposal.title || '[Encrypted - requires decryption]'}`);
      console.info(`Current Approvals: ${selectedProposal.approvals}`);
      console.info(`Executed: ${selectedProposal.executed ? 'Yes' : 'No'}`);
    }

    const confirmExecution = await confirm({
      message: `\nConfirm execution of emergency proposal ${proposalSelect}?`,
      default: false,
    });

    if (!confirmExecution) {
      console.info('Execution cancelled.');
      return;
    }

    const txHash = await executeEmergencyProposal(config, walletClient, publicClient, proposalSelect);

    console.info(`\n✅ Emergency proposal executed successfully!`);
    console.info(`Transaction hash: ${txHash}`);
    console.info(`View on explorer: ${config.urls.explorer}tx/${txHash}`);
  } catch (error) {
    console.error('Failed to execute emergency proposal:', error);
    throw error;
  }
}
