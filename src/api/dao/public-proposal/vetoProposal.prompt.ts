import { select, confirm } from '@inquirer/prompts';
import { WalletClient, formatUnits } from 'viem';
import { INetworkConfig } from '../../../types/network.type';
import { getPublicClient } from '../../viem';
import getPublicProposals from './getPublicProposals';
import {
  vetoProposal,
  canVetoProposal,
  hasVetoedProposal,
  isMinVetoRatioReached,
  getMinVetoRatio,
} from './vetoProposal';
import { ABIs } from '../../../abi';

export async function vetoProposalPrompt(config: INetworkConfig, walletClient: WalletClient): Promise<void> {
  try {
    const publicClient = getPublicClient(config);
    const voterAddress = walletClient.account?.address as `0x${string}`;

    // Fetch all public proposals
    console.info('Fetching public proposals...');
    const proposals = await getPublicProposals(config);

    if (!proposals || proposals.length === 0) {
      console.info('No public proposals found.');
      return;
    }

    // Filter proposals that can be vetoed
    const vetoableProposals = [];
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];

      // Skip executed proposals
      if (proposal.executed) {
        continue;
      }

      // Get proposal details from contract
      const proposalId = await publicClient.readContract({
        abi: ABIs.OptimisticTokenVotingPlugin,
        address: config.contracts.OptimisticTokenVotingPlugin,
        functionName: 'proposalIds',
        args: [i],
      });

      // Check if the proposal is still in veto period
      const canVeto = await canVetoProposal(config, publicClient, i, voterAddress);
      const hasVetoed = await hasVetoedProposal(config, publicClient, i, voterAddress);
      const vetoReached = await isMinVetoRatioReached(config, publicClient, i);

      // Get proposal details from contract for veto tally
      const proposalData = await publicClient.readContract({
        abi: ABIs.OptimisticTokenVotingPlugin,
        address: config.contracts.OptimisticTokenVotingPlugin,
        functionName: 'getProposal',
        args: [proposalId],
      });

      const vetoTally = proposalData[3] as bigint;

      vetoableProposals.push({
        index: i,
        proposalId,
        proposal,
        canVeto,
        hasVetoed,
        vetoReached,
        vetoTally,
        endDate: (proposal as any).endDate,
      });
    }

    if (vetoableProposals.length === 0) {
      console.info(
        'No proposals available for vetoing (all proposals are either executed, expired, or you have already vetoed them).',
      );
      return;
    }

    // Get min veto ratio for display
    const minVetoRatio = await getMinVetoRatio(config, publicClient);
    const minVetoPercentage = (minVetoRatio / 10000).toFixed(2); // Convert from basis points

    // Display proposals and let user select
    const proposalChoice = await select({
      message: 'Select a proposal to veto:',
      choices: vetoableProposals.map((p) => {
        let status = '';
        if (p.vetoReached) {
          status = ' ⚠️ [Veto Threshold Reached]';
        } else if (p.hasVetoed) {
          status = ' ✓ [Already Vetoed]';
        } else if (!p.canVeto) {
          status = ' ⏰ [Cannot Veto - Expired or Not Started]';
        }

        const vetoTallyFormatted = formatUnits(p.vetoTally, 18); // Assuming 18 decimals for token

        return {
          name: `#${p.index + 1}: ${p.proposal.title || 'Untitled'}${status} (Veto Tally: ${vetoTallyFormatted})`,
          value: p.index,
          disabled: !p.canVeto || p.hasVetoed,
        };
      }),
    });

    const selectedProposal = vetoableProposals.find((p) => p.index === proposalChoice);
    if (!selectedProposal) {
      console.error('Invalid proposal selection');
      return;
    }

    // Display detailed proposal information
    console.info('\n=== Proposal Details ===');
    console.info(`Title: ${selectedProposal.proposal.title || 'Untitled'}`);
    console.info(`Description: ${selectedProposal.proposal.description || 'No description'}`);
    console.info(`Current Veto Tally: ${formatUnits(selectedProposal.vetoTally, 18)} tokens`);
    console.info(`Minimum Veto Ratio Required: ${minVetoPercentage}%`);
    if (selectedProposal.endDate) {
      console.info(`Veto Period Ends: ${selectedProposal.endDate.toLocaleString()}`);
    }
    console.info('\n');

    // Get user's voting power
    const votingToken = await publicClient.readContract({
      address: config.contracts.OptimisticTokenVotingPlugin,
      abi: ABIs.OptimisticTokenVotingPlugin,
      functionName: 'votingToken',
      args: [],
    });

    const votingTokenAddress = votingToken as any as `0x${string}`;
    const userVotingPower = await publicClient.readContract({
      address: votingTokenAddress,
      abi: ABIs.VotingToken,
      functionName: 'getVotes',
      args: [voterAddress],
    });

    console.info(`Your Voting Power: ${formatUnits(userVotingPower as any as bigint, 18)} tokens`);
    console.info('\n');

    // Confirm veto
    const confirmVeto = await confirm({
      message: `Are you sure you want to veto proposal #${selectedProposal.index + 1}? This action cannot be undone.`,
      default: false,
    });

    if (!confirmVeto) {
      console.info('Veto cancelled.');
      return;
    }

    // Execute veto
    const txHash = await vetoProposal(config, walletClient, publicClient, selectedProposal.index);

    console.info(`✅ Veto transaction successful!`);
    console.info(`Transaction hash: ${txHash}`);
    console.info(`View on explorer: ${config.urls.explorer}/tx/${txHash}`);
  } catch (error) {
    console.error('Error in veto proposal prompt:');
    console.error(error instanceof Error ? error.message : error);
  }
}

export default vetoProposalPrompt;
