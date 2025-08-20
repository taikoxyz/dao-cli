import interactWithContractPrompt from '../../src/api/interactWithContract.prompt';
import { select } from '@inquirer/prompts';
import { getPublicClient } from '../../src/api/viem';
import { Address } from 'viem';
import { INetworkConfig } from '../../src/types/network.type';

jest.mock('@inquirer/prompts');
jest.mock('../../src/api/viem');

describe('interactWithContractPrompt', () => {
  const mockConfig: INetworkConfig = {
    network: 'mainnet',
    chainId: 1,
    contracts: {
      DAO: '0x1234567890123456789012345678901234567890' as Address,
      VotingToken: '0x0000000000000000000000000000000000000002' as Address,
      TaikoBridge: '0x0000000000000000000000000000000000000003' as Address,
      MultisigPlugin: '0x0000000000000000000000000000000000000004' as Address,
      EmergencyMultisigPlugin: '0x0000000000000000000000000000000000000005' as Address,
      OptimisticTokenVotingPlugin: '0x0000000000000000000000000000000000000006' as Address,
      SignerList: '0x0000000000000000000000000000000000000007' as Address,
      EncryptionRegistry: '0x0000000000000000000000000000000000000008' as Address,
      DelegationWall: '0x0000000000000000000000000000000000000009' as Address,
    },
    urls: {
      explorer: 'https://etherscan.io',
      rpc: 'https://mainnet.infura.io',
    },
    subgraph: 'https://api.thegraph.com/subgraphs/name/test',
  };

  const mockAbi = [
    {
      type: 'function',
      name: 'balanceOf',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'totalSupply',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'transfer',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
    },
    {
      type: 'function',
      name: 'approve',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should display both read and write methods in sorted order', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('balanceOf');

    await interactWithContractPrompt(
      mockConfig,
      'TestContract',
      '0x1234567890123456789012345678901234567890' as Address,
      mockAbi,
    );

    expect(mockSelect).toHaveBeenCalledWith({
      message: 'Select the method you want to call on [TestContract]: 0x1234567890123456789012345678901234567890',
      choices: expect.arrayContaining([
        expect.objectContaining({
          name: 'balanceOf (Read) [account]',
          value: 'balanceOf',
        }),
        expect.objectContaining({
          name: 'totalSupply (Read) []',
          value: 'totalSupply',
        }),
        expect.objectContaining({
          name: 'transfer (Write) [to, amount]',
          value: 'transfer',
        }),
        expect.objectContaining({
          name: 'approve (Write) [spender, amount]',
          value: 'approve',
        }),
      ]),
    });
  });

  it('should execute read method without parameters', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;

    mockSelect.mockResolvedValueOnce('totalSupply');

    const mockReadContract = jest.fn().mockResolvedValue('1000000000000000000');
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    const result = await interactWithContractPrompt(
      mockConfig,
      'TestContract',
      '0x1234567890123456789012345678901234567890' as Address,
      mockAbi,
    );

    expect(mockGetPublicClient).toHaveBeenCalledWith(mockConfig);
    expect(mockReadContract).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      abi: mockAbi,
      functionName: 'totalSupply',
    });
    expect(result).toBe('1000000000000000000');
  });

  it('should show error for read methods with parameters', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('balanceOf');

    const result = await interactWithContractPrompt(
      mockConfig,
      'TestContract',
      '0x1234567890123456789012345678901234567890' as Address,
      mockAbi,
    );

    expect(console.error).toHaveBeenCalledWith(
      `⚠️ Methods with parameters not supported yet. Please interact via ${mockConfig.urls.explorer} instead.`,
    );
    expect(result).toBeUndefined();
  });

  it('should show error for write methods', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('transfer');

    const result = await interactWithContractPrompt(
      mockConfig,
      'TestContract',
      '0x1234567890123456789012345678901234567890' as Address,
      mockAbi,
    );

    expect(console.error).toHaveBeenCalledWith(
      `⚠️ Methods with parameters not supported yet. Please interact via ${mockConfig.urls.explorer} instead.`,
    );
    expect(result).toBeUndefined();
  });

  it('should throw error if method is not valid', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('nonExistentMethod');

    const invalidAbi = [
      {
        type: 'function',
        name: 'someOtherMethod',
        stateMutability: 'view',
        inputs: [],
        outputs: [],
      },
    ];

    await expect(
      interactWithContractPrompt(
        mockConfig,
        'TestContract',
        '0x1234567890123456789012345678901234567890' as Address,
        invalidAbi,
      ),
    ).rejects.toThrow('Method nonExistentMethod is not a valid read or write method.');
  });

  it('should handle empty ABI', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('nonExistentMethod');

    await expect(
      interactWithContractPrompt(
        mockConfig,
        'TestContract',
        '0x1234567890123456789012345678901234567890' as Address,
        [],
      ),
    ).rejects.toThrow('Method nonExistentMethod is not a valid read or write method.');
  });

  it('should filter out non-function ABI items', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('getName');

    const abiWithEvents = [
      {
        type: 'event',
        name: 'Transfer',
        inputs: [],
      },
      {
        type: 'function',
        name: 'getName',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'string' }],
      },
      {
        type: 'constructor',
        inputs: [],
      },
    ];

    const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
    const mockReadContract = jest.fn().mockResolvedValue('Test Name');
    mockGetPublicClient.mockReturnValue({
      readContract: mockReadContract,
    } as any);

    await interactWithContractPrompt(
      mockConfig,
      'TestContract',
      '0x1234567890123456789012345678901234567890' as Address,
      abiWithEvents,
    );

    expect(mockSelect).toHaveBeenCalledWith({
      message: 'Select the method you want to call on [TestContract]: 0x1234567890123456789012345678901234567890',
      choices: [
        {
          name: 'getName (Read) []',
          value: 'getName',
        },
      ],
    });
  });
});
