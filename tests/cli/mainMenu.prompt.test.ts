import { WalletClient } from 'viem';
import { selectMainMenuPrompt } from '../../src/cli/mainMenu.prompt';
import { INetworkConfig } from '../../src/types/network.type';
import * as inquirer from '@inquirer/prompts';
import getSecurityCouncilMembers from '../../src/api/dao/security-council/getSecurityCouncilMembers';
import isSecurityCouncilMember from '../../src/api/dao/security-council/isAppointedAgent';
import getStandardProposals from '../../src/api/dao/standard-proposal/getStandardProposals';
import getEmergencyProposals from '../../src/api/dao/emergency-proposal/getEmergencyProposals';
import getPublicProposals from '../../src/api/dao/public-proposal/getPublicProposals';
import { getPublicClient } from '../../src/api/viem';
import { ABIs } from '../../src/abi';
import getDelegates, { getDelegateCount, getDelegate, DelegateProfile } from '../../src/api/dao/delegates/getDelegates';

// Test types
// Unused interfaces commented out to fix linter warnings
// interface MockWalletClient {
//   account: {
//     address: string;
//   };
// }

// interface MockPublicClient {
//   readContract: jest.Mock;
// }

// Mock all dependencies
jest.mock('@inquirer/prompts');
jest.mock('../../src/api/dao/security-council/getSecurityCouncilMembers');
jest.mock('../../src/api/dao/security-council/isAppointedAgent');
jest.mock('../../src/api/dao/standard-proposal/getStandardProposals');
jest.mock('../../src/api/dao/emergency-proposal/getEmergencyProposals');
jest.mock('../../src/api/dao/public-proposal/getPublicProposals');
jest.mock('../../src/api/viem');
jest.mock('../../src/abi');
jest.mock('../../src/api/dao/delegates/getDelegates');

const mockSelect = inquirer.select as jest.Mock;
const mockInput = inquirer.input as jest.Mock;
const mockGetSecurityCouncilMembers = getSecurityCouncilMembers as jest.MockedFunction<
  typeof getSecurityCouncilMembers
>;
const mockIsSecurityCouncilMember = isSecurityCouncilMember as jest.MockedFunction<typeof isSecurityCouncilMember>;
const mockGetStandardProposals = getStandardProposals as jest.MockedFunction<typeof getStandardProposals>;
const mockGetEmergencyProposals = getEmergencyProposals as jest.MockedFunction<typeof getEmergencyProposals>;
const mockGetPublicProposals = getPublicProposals as jest.MockedFunction<typeof getPublicProposals>;
const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
const mockGetDelegates = getDelegates as jest.MockedFunction<typeof getDelegates>;
const mockGetDelegateCount = getDelegateCount as jest.MockedFunction<typeof getDelegateCount>;
const mockGetDelegate = getDelegate as jest.MockedFunction<typeof getDelegate>;

describe('selectMainMenuPrompt', () => {
  let mockConfig: INetworkConfig;
  let mockWalletClient: WalletClient;
  let mockPublicClient: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock process.exit to prevent tests from actually exiting
    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    mockConfig = {
      network: 'holesky',
      chainId: 17000,
      urls: {
        rpc: 'https://rpc.holesky.ethpandaops.io',
        explorer: 'https://holesky.etherscan.io',
      },
      subgraph: 'https://subgraph.holesky.example.com',
      contracts: {
        DAO: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        VotingToken: '0x2345678901abcdef2345678901abcdef23456789' as `0x${string}`,
        TaikoBridge: '0x3456789012abcdef3456789012abcdef34567890' as `0x${string}`,
        MultisigPlugin: '0x4567890123abcdef4567890123abcdef45678901' as `0x${string}`,
        EmergencyMultisigPlugin: '0x5678901234abcdef5678901234abcdef56789012' as `0x${string}`,
        OptimisticTokenVotingPlugin: '0x6789012345abcdef6789012345abcdef67890123' as `0x${string}`,
        SignerList: '0x7890123456abcdef7890123456abcdef78901234' as `0x${string}`,
        EncryptionRegistry: '0x8901234567abcdef8901234567abcdef89012345' as `0x${string}`,
        DelegationWall: '0x9012345678abcdef9012345678abcdef90123456' as `0x${string}`,
      },
    };

    mockWalletClient = {
      account: {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
      },
    } as any;

    mockPublicClient = {
      readContract: jest.fn(),
    };

    mockGetPublicClient.mockReturnValue(mockPublicClient as any);

    // Mock ABIs
    // eslint-disable-next-line no-import-assign
    (ABIs as unknown) = {
      DAO: [
        {
          name: 'getBalance',
          type: 'function',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        },
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
        },
      ],
      VotingToken: [
        {
          name: 'balanceOf',
          type: 'function',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        },
      ],
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('main menu selection', () => {
    it('should display main menu options', async () => {
      mockSelect.mockImplementation(() => {
        throw new Error('process.exit called'); // Simulate exit to stop recursion
      });

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected to throw due to mocked exit
      }

      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Welcome to the DAO CLI. What module would you like to use?',
        choices: [
          { value: 'Public Stage Proposals' },
          { value: 'Security Council' },
          { value: 'Delegates' },
          { value: 'Read Bare Contracts' },
          { value: 'Exit' },
        ],
      });
    });

    it('should exit when Exit is selected', async () => {
      mockSelect.mockResolvedValue('Exit');

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }
    });
  });

  describe('Public Stage Proposals', () => {
    it('should fetch and display public proposals', async () => {
      const mockProposals: Array<unknown> = [
        { title: 'Proposal 1', description: 'Description 1' },
        { title: 'Proposal 2', description: 'Description 2' },
      ];

      mockSelect.mockResolvedValueOnce('Public Stage Proposals').mockResolvedValueOnce(0); // Select first proposal
      mockGetPublicProposals.mockResolvedValue(mockProposals as any);

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Will eventually recurse and throw
      }

      expect(mockGetPublicProposals).toHaveBeenCalledWith(mockConfig);
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a public stage proposal to view details:',
        choices: [
          { name: 'Proposal #1: Proposal 1', value: 0 },
          { name: 'Proposal #2: Proposal 2', value: 1 },
        ],
      });
      expect(consoleInfoSpy).toHaveBeenCalledWith(mockProposals[0]);

      consoleInfoSpy.mockRestore();
    });

    it('should handle empty public proposals list', async () => {
      mockSelect.mockResolvedValueOnce('Public Stage Proposals');
      mockGetPublicProposals.mockResolvedValue([]);

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(mockGetPublicProposals).toHaveBeenCalledWith(mockConfig);
      expect(consoleInfoSpy).toHaveBeenCalledWith('No public stage proposals found.');

      consoleInfoSpy.mockRestore();
    });

    it('should handle null public proposals', async () => {
      mockSelect.mockResolvedValueOnce('Public Stage Proposals');
      mockGetPublicProposals.mockResolvedValue(null as any);

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(mockGetPublicProposals).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('Security Council - Not a Member', () => {
    beforeEach(() => {
      const mockMembers = [
        { owner: '0x1111' as `0x${string}`, signer: '0x2222' as `0x${string}` },
        { owner: '0x3333' as `0x${string}`, signer: '0x4444' as `0x${string}` },
      ];
      mockGetSecurityCouncilMembers.mockResolvedValue(
        mockMembers as Array<{ owner: `0x${string}`; signer: `0x${string}` }>,
      );
      mockIsSecurityCouncilMember.mockResolvedValue(false);
    });

    it('should display security council members when not a member', async () => {
      mockSelect.mockResolvedValueOnce('Security Council');

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(mockGetSecurityCouncilMembers).toHaveBeenCalledWith(mockConfig);
      expect(mockIsSecurityCouncilMember).toHaveBeenCalledWith(mockWalletClient.account?.address, mockConfig);
      expect(consoleTableSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        `Your account (${mockWalletClient.account?.address}) is NOT an appointed agent of the Security Council.`,
      );

      consoleInfoSpy.mockRestore();
      consoleTableSpy.mockRestore();
    });
  });

  describe('Security Council - Is a Member', () => {
    beforeEach(() => {
      const mockMembers = [
        { owner: '0x1111' as `0x${string}`, signer: mockWalletClient.account?.address as `0x${string}` },
      ];
      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);
      mockIsSecurityCouncilMember.mockResolvedValue(true);
    });

    it('should show security council member options', async () => {
      mockSelect
        .mockResolvedValueOnce('Security Council')
        .mockResolvedValueOnce('View Standard Proposals')
        .mockResolvedValueOnce(0); // Select first proposal

      const mockStandardProposals: Array<{ title: string; description: string }> = [
        { title: 'Standard Proposal 1', description: 'Standard Description' },
      ];
      mockGetStandardProposals.mockResolvedValue(mockStandardProposals as any);

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        `Your account (${mockWalletClient.account?.address}) is an appointed agent of the Security Council.`,
      );
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'What would you like to do as a Security Council member?',
        choices: [
          { value: 'Create New Proposal' },
          { value: 'Approve/Execute Proposals' },
          { value: 'View Standard Proposals' },
          { value: 'View Emergency Proposals' },
        ],
      });
      expect(mockGetStandardProposals).toHaveBeenCalledWith(mockConfig);

      consoleInfoSpy.mockRestore();
      consoleTableSpy.mockRestore();
    });

    it('should handle emergency proposals for security council members', async () => {
      mockSelect
        .mockResolvedValueOnce('Security Council')
        .mockResolvedValueOnce('View Emergency Proposals')
        .mockResolvedValueOnce(0); // Select first proposal

      const mockEmergencyProposals: Array<{ title: string; description: string }> = [
        { title: 'Emergency Proposal 1', description: 'Test emergency proposal' },
      ];

      mockGetEmergencyProposals.mockResolvedValue(mockEmergencyProposals as any);

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(mockGetEmergencyProposals).toHaveBeenCalledWith(mockConfig);
      expect(consoleInfoSpy).toHaveBeenCalledWith(mockEmergencyProposals[0]);

      consoleInfoSpy.mockRestore();
    });

    it('should handle invalid security council action', async () => {
      mockSelect.mockResolvedValueOnce('Security Council').mockResolvedValueOnce('Invalid Action');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid action selected: Invalid Action');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Delegates', () => {
    it('should fetch and display delegates when no delegates exist', async () => {
      mockSelect
        .mockResolvedValueOnce('Delegates')
        .mockResolvedValueOnce('View Delegates');

      // Mock delegate functions
      mockGetDelegateCount.mockResolvedValueOnce(0);
      mockGetDelegates.mockResolvedValueOnce([]);

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(consoleInfoSpy).toHaveBeenCalledWith('Fetching delegates from DelegationWall contract...');
      expect(consoleInfoSpy).toHaveBeenCalledWith('\nTotal registered delegates: 0');
      expect(consoleInfoSpy).toHaveBeenCalledWith('No delegates have registered yet.');
      expect(mockGetDelegateCount).toHaveBeenCalled();
      expect(mockGetDelegates).toHaveBeenCalled();

      consoleInfoSpy.mockRestore();
    });

    it('should display delegate list and fetch details when delegates exist', async () => {
      const mockDelegatesList: DelegateProfile[] = [
        {
          address: '0xdelegate1',
          identifier: 'Alice Delegate',
          contentUrl: 'ipfs://QmAlice',
        },
        {
          address: '0xdelegate2',
          identifier: undefined,
          contentUrl: 'ipfs://QmBob',
        },
      ];

      const mockFullDelegate: DelegateProfile = {
        address: '0xdelegate1',
        identifier: 'Alice Delegate',
        contentUrl: 'ipfs://QmAlice',
        votingPower: 1000000000000000000n, // 1 token
        tokenBalance: 500000000000000000n, // 0.5 tokens
        metadata: {
          name: 'Alice',
          bio: 'Experienced delegate',
        },
      };

      mockSelect
        .mockResolvedValueOnce('Delegates')
        .mockResolvedValueOnce('View Delegates')
        .mockResolvedValueOnce('0xdelegate1'); // Select first delegate

      mockGetDelegateCount.mockResolvedValueOnce(2);
      mockGetDelegates.mockResolvedValueOnce(mockDelegatesList);
      mockGetDelegate.mockResolvedValueOnce(mockFullDelegate);

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(consoleInfoSpy).toHaveBeenCalledWith('Fetching delegates from DelegationWall contract...');
      expect(consoleInfoSpy).toHaveBeenCalledWith('\nTotal registered delegates: 2');

      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a delegate to view details:',
        choices: [
          {
            name: 'Alice Delegate - 0xdelegate1',
            value: '0xdelegate1',
          },
          {
            name: 'Unnamed Delegate - 0xdelegate2',
            value: '0xdelegate2',
          },
        ],
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith('\nFetching delegate details and voting power...');
      expect(consoleInfoSpy).toHaveBeenCalledWith('\n--- Delegate Profile ---');
      expect(consoleInfoSpy).toHaveBeenCalledWith('Identifier: Alice Delegate');
      expect(consoleInfoSpy).toHaveBeenCalledWith('Address: 0xdelegate1');
      expect(consoleInfoSpy).toHaveBeenCalledWith('Content URL: ipfs://QmAlice');
      expect(consoleInfoSpy).toHaveBeenCalledWith('\n--- Voting Power ---');
      expect(consoleInfoSpy).toHaveBeenCalledWith('Total Voting Power: 1.0000 votes');
      expect(consoleInfoSpy).toHaveBeenCalledWith('Token Balance: 0.5000 tokens');
      expect(consoleInfoSpy).toHaveBeenCalledWith('\n--- Full Metadata ---');

      expect(mockGetDelegate).toHaveBeenCalledWith('0xdelegate1', mockConfig, true);

      consoleInfoSpy.mockRestore();
    });

    it('should handle delegate fetch failure', async () => {
      const mockDelegatesList: DelegateProfile[] = [
        {
          address: '0xdelegate1',
          identifier: 'Alice Delegate',
          contentUrl: 'ipfs://QmAlice',
        },
      ];

      mockSelect
        .mockResolvedValueOnce('Delegates')
        .mockResolvedValueOnce('View Delegates')
        .mockResolvedValueOnce('0xdelegate1');

      mockGetDelegateCount.mockResolvedValueOnce(1);
      mockGetDelegates.mockResolvedValueOnce(mockDelegatesList);
      mockGetDelegate.mockResolvedValueOnce(null); // Simulate failure

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch delegate details.');

      consoleInfoSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Read Bare Contracts', () => {
    it('should allow reading contract methods', async () => {
      mockSelect
        .mockResolvedValueOnce('Read Bare Contracts')
        .mockResolvedValueOnce(mockConfig.contracts.DAO) // Select DAO contract
        .mockResolvedValueOnce('getBalance'); // Select method

      mockInput.mockResolvedValue(''); // No parameters needed
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue('1000');

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a contract to read:',
        choices: Object.entries(mockConfig.contracts).map(([name, address]) => ({
          name: `${name} (${address})`,
          value: address,
        })),
      });

      expect(mockSelect).toHaveBeenCalledWith({
        message: `Select a method to call on contract ${mockConfig.contracts.DAO}:`,
        choices: [{ name: 'getBalance ()', value: 'getBalance' }],
      });

      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.DAO,
        abi: ABIs.DAO,
        functionName: 'getBalance',
        args: [],
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        `Result of calling getBalance on DAO at address ${mockConfig.contracts.DAO}:`,
        '1000',
      );

      consoleInfoSpy.mockRestore();
    });

    it('should handle contract methods with parameters', async () => {
      mockSelect
        .mockResolvedValueOnce('Read Bare Contracts')
        .mockResolvedValueOnce(mockConfig.contracts.VotingToken)
        .mockResolvedValueOnce('balanceOf');

      mockInput.mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678');
      (mockPublicClient.readContract as jest.Mock).mockResolvedValue('500');

      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter value for account (address):',
        validate: expect.any(Function),
      });

      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.VotingToken,
        abi: ABIs.VotingToken,
        functionName: 'balanceOf',
        args: ['0x1234567890abcdef1234567890abcdef12345678'],
      });

      consoleInfoSpy.mockRestore();
    });

    it('should validate empty input parameters', async () => {
      mockSelect
        .mockResolvedValueOnce('Read Bare Contracts')
        .mockResolvedValueOnce(mockConfig.contracts.VotingToken)
        .mockResolvedValueOnce('balanceOf');

      mockInput.mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678');

      try {
        await selectMainMenuPrompt(mockConfig, mockWalletClient);
      } catch {
        // Expected due to recursion
      }

      // Test the validation function
      const validateFn = mockInput.mock.calls[0][0].validate;
      if (validateFn) {
        expect(validateFn('')).toBe('This field cannot be empty.');
        expect(validateFn('valid_input')).toBe(true);
      }
    });
  });
});
