import { select, confirm } from '@inquirer/prompts';
import { vetoProposalPrompt } from '../../../../src/api/dao/public-proposal/vetoProposal.prompt';
import * as vetoModule from '../../../../src/api/dao/public-proposal/vetoProposal';
import getPublicProposals from '../../../../src/api/dao/public-proposal/getPublicProposals';
import * as viemModule from '../../../../src/api/viem';
import { INetworkConfig } from '../../../../src/types/network.type';

// Mock inquirer prompts
jest.mock('@inquirer/prompts', () => ({
  select: jest.fn(),
  confirm: jest.fn(),
}));

// Mock the viem module
jest.mock('../../../../src/api/viem', () => ({
  getPublicClient: jest.fn(),
}));

// Mock the getPublicProposals module
jest.mock('../../../../src/api/dao/public-proposal/getPublicProposals');

// Mock the veto module
jest.mock('../../../../src/api/dao/public-proposal/vetoProposal', () => ({
  vetoProposal: jest.fn(),
  canVetoProposal: jest.fn(),
  hasVetoedProposal: jest.fn(),
  isMinVetoRatioReached: jest.fn(),
  getMinVetoRatio: jest.fn(),
}));

// Mock the ABIs
jest.mock('../../../../src/abi', () => ({
  ABIs: {
    OptimisticTokenVotingPlugin: [],
    VotingToken: [],
  },
}));

describe('vetoProposalPrompt', () => {
  let mockConfig: INetworkConfig;
  let mockWalletClient: any;
  let mockPublicClient: any;
  let consoleSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();

    consoleSpy = {
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };

    mockConfig = {
      network: 'test',
      chainId: 1,
      urls: {
        rpc: 'http://localhost:8545',
        explorer: 'http://localhost:3000',
      },
      subgraph: 'http://localhost:8000',
      contracts: {
        DAO: '0x0000000000000000000000000000000000000001' as `0x${string}`,
        VotingToken: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        TaikoBridge: '0x0000000000000000000000000000000000000003' as `0x${string}`,
        MultisigPlugin: '0x0000000000000000000000000000000000000004' as `0x${string}`,
        EmergencyMultisigPlugin: '0x0000000000000000000000000000000000000005' as `0x${string}`,
        OptimisticTokenVotingPlugin: '0x0000000000000000000000000000000000000006' as `0x${string}`,
        SignerList: '0x0000000000000000000000000000000000000007' as `0x${string}`,
        EncryptionRegistry: '0x0000000000000000000000000000000000000008' as `0x${string}`,
        DelegationWall: '0x0000000000000000000000000000000000000009' as `0x${string}`,
      },
    };

    mockWalletClient = {
      account: {
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      },
    };

    mockPublicClient = {
      readContract: jest.fn(),
    };

    (viemModule.getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
  });

  it('should handle no proposals gracefully', async () => {
    (getPublicProposals as jest.Mock).mockResolvedValue([]);

    await vetoProposalPrompt(mockConfig, mockWalletClient);

    expect(consoleSpy.info).toHaveBeenCalledWith('No public proposals found.');
    expect(select).not.toHaveBeenCalled();
  });

  it('should handle no vetoable proposals', async () => {
    const mockProposals = [
      {
        title: 'Executed Proposal',
        description: 'Already executed',
        executed: true,
        endDate: new Date(),
      },
    ];

    (getPublicProposals as jest.Mock).mockResolvedValue(mockProposals);
    mockPublicClient.readContract.mockResolvedValue(BigInt(1));

    await vetoProposalPrompt(mockConfig, mockWalletClient);

    expect(consoleSpy.info).toHaveBeenCalledWith(
      'No proposals available for vetoing (all proposals are either executed, expired, or you have already vetoed them).',
    );
  });

  it('should successfully veto a proposal', async () => {
    const mockProposals = [
      {
        title: 'Test Proposal',
        description: 'Test description',
        executed: false,
        endDate: new Date(Date.now() + 86400000), // Tomorrow
      },
    ];

    (getPublicProposals as jest.Mock).mockResolvedValue(mockProposals);

    // Mock contract reads
    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(1)) // proposalId
      .mockResolvedValueOnce([
        true, // open
        false, // executed
        {}, // parameters
        BigInt(1000000000000000000), // vetoTally (1 token)
        '0x', // metadataURI
        [], // actions
        0, // allowFailureMap
      ]) // getProposal
      .mockResolvedValueOnce('0xTokenAddress') // votingToken
      .mockResolvedValueOnce(BigInt(5000000000000000000)); // getVotes (5 tokens)

    (vetoModule.canVetoProposal as jest.Mock).mockResolvedValue(true);
    (vetoModule.hasVetoedProposal as jest.Mock).mockResolvedValue(false);
    (vetoModule.isMinVetoRatioReached as jest.Mock).mockResolvedValue(false);
    (vetoModule.getMinVetoRatio as jest.Mock).mockResolvedValue(2500); // 25%
    (vetoModule.vetoProposal as jest.Mock).mockResolvedValue('0xtxhash');

    (select as jest.Mock).mockResolvedValue(0); // Select first proposal
    (confirm as jest.Mock).mockResolvedValue(true); // Confirm veto

    await vetoProposalPrompt(mockConfig, mockWalletClient);

    expect(vetoModule.vetoProposal).toHaveBeenCalledWith(mockConfig, mockWalletClient, mockPublicClient, 0);
    expect(consoleSpy.info).toHaveBeenCalledWith('✅ Veto transaction successful!');
    expect(consoleSpy.info).toHaveBeenCalledWith('Transaction hash: 0xtxhash');
  });

  it('should handle user cancellation', async () => {
    const mockProposals = [
      {
        title: 'Test Proposal',
        description: 'Test description',
        executed: false,
        endDate: new Date(Date.now() + 86400000),
      },
    ];

    (getPublicProposals as jest.Mock).mockResolvedValue(mockProposals);

    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(1)) // proposalId
      .mockResolvedValueOnce([true, false, {}, BigInt(1000000000000000000), '0x', [], 0]) // getProposal
      .mockResolvedValueOnce('0xTokenAddress') // votingToken
      .mockResolvedValueOnce(BigInt(5000000000000000000)); // getVotes

    (vetoModule.canVetoProposal as jest.Mock).mockResolvedValue(true);
    (vetoModule.hasVetoedProposal as jest.Mock).mockResolvedValue(false);
    (vetoModule.isMinVetoRatioReached as jest.Mock).mockResolvedValue(false);
    (vetoModule.getMinVetoRatio as jest.Mock).mockResolvedValue(2500);

    (select as jest.Mock).mockResolvedValue(0);
    (confirm as jest.Mock).mockResolvedValue(false); // User cancels

    await vetoProposalPrompt(mockConfig, mockWalletClient);

    expect(vetoModule.vetoProposal).not.toHaveBeenCalled();
    expect(consoleSpy.info).toHaveBeenCalledWith('Veto cancelled.');
  });

  it('should display veto threshold reached warning', async () => {
    const mockProposals = [
      {
        title: 'Test Proposal',
        description: 'Test description',
        executed: false,
        endDate: new Date(Date.now() + 86400000),
      },
    ];

    (getPublicProposals as jest.Mock).mockResolvedValue(mockProposals);

    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(1)) // proposalId
      .mockResolvedValueOnce([
        true,
        false,
        {},
        BigInt(10000000000000000000), // High veto tally
        '0x',
        [],
        0,
      ]); // getProposal

    (vetoModule.canVetoProposal as jest.Mock).mockResolvedValue(false); // Cannot veto anymore
    (vetoModule.hasVetoedProposal as jest.Mock).mockResolvedValue(false);
    (vetoModule.isMinVetoRatioReached as jest.Mock).mockResolvedValue(true); // Threshold reached
    (vetoModule.getMinVetoRatio as jest.Mock).mockResolvedValue(2500);

    await vetoProposalPrompt(mockConfig, mockWalletClient);

    // Check that the proposal shows as threshold reached in the selection
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('⚠️ [Veto Threshold Reached]'),
            disabled: true,
          }),
        ]),
      }),
    );
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Network error');
    (getPublicProposals as jest.Mock).mockRejectedValue(error);

    await vetoProposalPrompt(mockConfig, mockWalletClient);

    expect(consoleSpy.error).toHaveBeenCalledWith('Error in veto proposal prompt:');
    expect(consoleSpy.error).toHaveBeenCalledWith('Network error');
  });
});
