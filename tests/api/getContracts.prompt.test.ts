import getContractsPrompt from '../../src/api/getContracts.prompt';
import { select } from '@inquirer/prompts';
import { ABIs } from '../../src/abi';
import { INetworkConfig } from '../../src/types/network.type';
import { Address } from 'viem';

jest.mock('@inquirer/prompts');
jest.mock('../../src/abi', () => ({
  ABIs: {
    DAO: [{ name: 'dao-abi' }],
    MultisigPlugin: [{ name: 'multisig-abi' }],
    EmergencyMultisigPlugin: [{ name: 'emergency-abi' }],
    OptimisticTokenVotingPlugin: [{ name: 'voting-abi' }],
  },
}));

describe('getContractsPrompt', () => {
  const mockConfig: INetworkConfig = {
    network: 'mainnet',
    contracts: {
      DAO: '0x1234567890123456789012345678901234567890' as Address,
      VotingToken: '0x0000000000000000000000000000000000000002' as Address,
      TaikoBridge: '0x0000000000000000000000000000000000000003' as Address,
      MultisigPlugin: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address,
      EmergencyMultisigPlugin: '0x9876543210987654321098765432109876543210' as Address,
      OptimisticTokenVotingPlugin: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedc' as Address,
      SignerList: '0x0000000000000000000000000000000000000007' as Address,
      EncryptionRegistry: '0x0000000000000000000000000000000000000008' as Address,
      DelegationWall: '0x0000000000000000000000000000000000000009' as Address,
    },
    urls: {
      explorer: 'https://etherscan.io/',
      rpc: 'https://mainnet.infura.io',
    },
    subgraph: 'https://api.thegraph.com/subgraphs/name/test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display all contracts and return selected contract details', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('MultisigPlugin');

    const result = await getContractsPrompt(mockConfig);

    expect(mockSelect).toHaveBeenCalledWith({
      message: 'Select the contract you want to interact with',
      choices: [
        {
          name: 'DAO (https://etherscan.io/address/0x1234567890123456789012345678901234567890)',
          value: 'DAO',
        },
        {
          name: 'MultisigPlugin (https://etherscan.io/address/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd)',
          value: 'MultisigPlugin',
        },
        {
          name: 'EmergencyMultisigPlugin (https://etherscan.io/address/0x9876543210987654321098765432109876543210)',
          value: 'EmergencyMultisigPlugin',
        },
        {
          name: 'OptimisticTokenVotingPlugin (https://etherscan.io/address/0xfedcbafedcbafedcbafedcbafedcbafedcbafedc)',
          value: 'OptimisticTokenVotingPlugin',
        },
      ],
    });

    expect(result).toEqual({
      name: 'MultisigPlugin',
      abi: ABIs.MultisigPlugin,
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    });
  });

  it('should return DAO contract when selected', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('DAO');

    const result = await getContractsPrompt(mockConfig);

    expect(result).toEqual({
      name: 'DAO',
      abi: ABIs.DAO,
      address: '0x1234567890123456789012345678901234567890',
    });
  });

  it('should return EmergencyMultisigPlugin contract when selected', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('EmergencyMultisigPlugin');

    const result = await getContractsPrompt(mockConfig);

    expect(result).toEqual({
      name: 'EmergencyMultisigPlugin',
      abi: ABIs.EmergencyMultisigPlugin,
      address: '0x9876543210987654321098765432109876543210',
    });
  });

  it('should return OptimisticTokenVotingPlugin contract when selected', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('OptimisticTokenVotingPlugin');

    const result = await getContractsPrompt(mockConfig);

    expect(result).toEqual({
      name: 'OptimisticTokenVotingPlugin',
      abi: ABIs.OptimisticTokenVotingPlugin,
      address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedc',
    });
  });

  it('should handle config with different explorer URL format', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('DAO');

    const configWithDifferentExplorer = {
      ...mockConfig,
      urls: {
        ...mockConfig.urls,
        explorer: 'https://polygonscan.com/', // Different explorer
      },
    };

    await getContractsPrompt(configWithDifferentExplorer);

    expect(mockSelect).toHaveBeenCalledWith({
      message: 'Select the contract you want to interact with',
      choices: expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringContaining('https://polygonscan.com/address/'),
        }),
      ]),
    });
  });

  it('should handle config with missing trailing slash in explorer URL', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('DAO');

    const configWithoutTrailingSlash = {
      ...mockConfig,
      urls: {
        ...mockConfig.urls,
        explorer: 'https://etherscan.io', // No trailing slash
      },
    };

    await getContractsPrompt(configWithoutTrailingSlash);

    expect(mockSelect).toHaveBeenCalledWith({
      message: 'Select the contract you want to interact with',
      choices: expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringContaining('https://etherscan.ioaddress/'),
        }),
      ]),
    });
  });

  it('should handle subset of contracts in config', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('DAO');

    const configWithSubsetContracts = {
      ...mockConfig,
      contracts: {
        ...mockConfig.contracts,
        EmergencyMultisigPlugin: undefined as any,
        OptimisticTokenVotingPlugin: undefined as any,
      },
    };

    const result = await getContractsPrompt(configWithSubsetContracts);

    // Should still show all contracts from ABIs, but with undefined addresses
    expect(mockSelect).toHaveBeenCalledWith({
      message: 'Select the contract you want to interact with',
      choices: expect.arrayContaining([
        {
          name: 'DAO (https://etherscan.io/address/0x1234567890123456789012345678901234567890)',
          value: 'DAO',
        },
        {
          name: 'MultisigPlugin (https://etherscan.io/address/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd)',
          value: 'MultisigPlugin',
        },
        {
          name: 'EmergencyMultisigPlugin (https://etherscan.io/address/undefined)',
          value: 'EmergencyMultisigPlugin',
        },
        {
          name: 'OptimisticTokenVotingPlugin (https://etherscan.io/address/undefined)',
          value: 'OptimisticTokenVotingPlugin',
        },
      ]),
    });

    expect(result).toEqual({
      name: 'DAO',
      abi: ABIs.DAO,
      address: '0x1234567890123456789012345678901234567890',
    });
  });

  it('should maintain order of contracts from ABIs object', async () => {
    const mockSelect = select as jest.MockedFunction<typeof select>;
    mockSelect.mockResolvedValueOnce('DAO');

    await getContractsPrompt(mockConfig);

    const callArgs = (mockSelect as jest.Mock).mock.calls[0][0];
    const choices = callArgs.choices;
    const values = choices.map((c: any) => c.value);

    expect(values).toEqual(['DAO', 'MultisigPlugin', 'EmergencyMultisigPlugin', 'OptimisticTokenVotingPlugin']);
  });
});