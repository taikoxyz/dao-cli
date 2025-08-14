import readContractPrompt from '../../src/api/readContract.prompt';
import { select } from '@inquirer/prompts';
import { Address } from 'viem';
import { INetworkConfig } from '../../src/types/network.type';

jest.mock('@inquirer/prompts');

describe('readContractPrompt', () => {
  const mockConfig: INetworkConfig = {
    network: 'mainnet',
    contracts: {
      DAO: '0x1234567890123456789012345678901234567890' as Address,
      VotingToken: '0x0000000000000000000000000000000000000002' as Address,
      TaikoBridge: '0x0000000000000000000000000000000000000003' as Address,
      MultisigPlugin: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address,
      EmergencyMultisigPlugin: '0x9876543210987654321098765432109876543210' as Address,
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display the correct contract name when contract is found', async () => {
    const targetContract = '0x1234567890123456789012345678901234567890' as Address;
    const mockSelect = select as jest.MockedFunction<typeof select>;
    
    mockSelect.mockResolvedValueOnce('read');

    await readContractPrompt(mockConfig, targetContract);

    expect(mockSelect).toHaveBeenCalledWith({
      message: `What action would you like to perform on [DAO]: ${targetContract}?`,
      choices: [
        {
          value: 'read',
          name: 'Read Methods',
        },
      ],
    });
  });

  it('should display "Unknown Contract" when contract is not found', async () => {
    const targetContract = '0xffffffffffffffffffffffffffffffffffffffff' as Address;
    const mockSelect = select as jest.MockedFunction<typeof select>;
    
    mockSelect.mockResolvedValueOnce('read');

    await readContractPrompt(mockConfig, targetContract);

    expect(mockSelect).toHaveBeenCalledWith({
      message: `What action would you like to perform on [Unknown Contract]: ${targetContract}?`,
      choices: [
        {
          value: 'read',
          name: 'Read Methods',
        },
      ],
    });
  });

  it('should find MultisigPlugin contract correctly', async () => {
    const targetContract = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address;
    const mockSelect = select as jest.MockedFunction<typeof select>;
    
    mockSelect.mockResolvedValueOnce('read');

    await readContractPrompt(mockConfig, targetContract);

    expect(mockSelect).toHaveBeenCalledWith({
      message: `What action would you like to perform on [MultisigPlugin]: ${targetContract}?`,
      choices: [
        {
          value: 'read',
          name: 'Read Methods',
        },
      ],
    });
  });

  it('should handle checksummed addresses', async () => {
    // Use a valid checksummed address
    const targetContract = '0x1234567890123456789012345678901234567890' as Address;
    const mockSelect = select as jest.MockedFunction<typeof select>;
    
    mockSelect.mockResolvedValueOnce('read');

    await readContractPrompt(mockConfig, targetContract);

    expect(mockSelect).toHaveBeenCalledWith({
      message: `What action would you like to perform on [DAO]: ${targetContract}?`,
      choices: [
        {
          value: 'read',
          name: 'Read Methods',
        },
      ],
    });
  });
});