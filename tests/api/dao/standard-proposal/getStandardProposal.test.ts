import getStandardProposal from '../../../../src/api/dao/standard-proposal/getStandardProposal';
import { getPublicClient } from '../../../../src/api/viem';
import getIpfsFile, { getIpfsFileSafe } from '../../../../src/api/ipfs/getIpfsFile';
import { INetworkConfig } from '../../../../src/types/network.type';
import { MockPublicClient } from '../../../types/common.test';

jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/ipfs/getIpfsFile');

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
const mockGetIpfsFile = getIpfsFile as jest.MockedFunction<typeof getIpfsFile>;
const mockGetIpfsFileSafe = getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileSafe>;

describe('getStandardProposal', () => {
  let mockConfig: INetworkConfig;
  let mockPublicClient: MockPublicClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();

    mockPublicClient = {
      readContract: jest.fn(),
    };
    mockGetPublicClient.mockReturnValue(mockPublicClient as any);

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch a specific standard proposal', async () => {
    const proposalId = 1;
    const mockContractResponse = [
      false, // executed
      2n, // approvals
      {
        /* parameters */
      },
      '0x697066733a2f2f516d5465737431', // metadataURI (hex for ipfs://QmTest1)
      [], // destinationActions
      '0x0000000000000000000000000000000000000000', // destinationPlugin
    ];

    const mockMetadata = {
      title: 'Proposal 1',
      description: 'This is proposal 1',
      actions: [],
    };

    (mockPublicClient.readContract as jest.Mock).mockResolvedValue(mockContractResponse);
    mockGetIpfsFileSafe.mockResolvedValue(mockMetadata);

    const result = await getStandardProposal(proposalId, mockConfig);

    expect(result).toEqual({
      executed: false,
      approvals: 2n,
      parameters: {},
      metadataURI: 'ipfs://QmTest1',
      destinationActions: [],
      destinationPlugin: '0x0000000000000000000000000000000000000000',
      proposalId: 1,
      ...mockMetadata,
    });
    expect(mockPublicClient.readContract).toHaveBeenCalledWith({
      abi: expect.any(Array) as unknown[],
      address: mockConfig.contracts.MultisigPlugin,
      functionName: 'getProposal',
      args: [proposalId],
    });
    expect(mockGetIpfsFileSafe).toHaveBeenCalledWith('QmTest1');
  });

  it('should return undefined when proposal is not found', async () => {
    const proposalId = 999;

    (mockPublicClient.readContract as jest.Mock).mockRejectedValue(new Error('Proposal not found'));

    const result = await getStandardProposal(proposalId, mockConfig);

    expect(result).toBeUndefined();
    expect(mockGetIpfsFile).not.toHaveBeenCalled();
  });

  it('should handle IPFS fetch errors', async () => {
    const proposalId = 1;
    const mockContractResponse = [
      false, // executed
      2n, // approvals
      {
        /* parameters */
      },
      '0x697066733a2f2f516d5465737431', // metadataURI
      [], // destinationActions
      '0x0000000000000000000000000000000000000000', // destinationPlugin
    ];

    (mockPublicClient.readContract as jest.Mock).mockResolvedValue(mockContractResponse);
    mockGetIpfsFileSafe.mockRejectedValue(new Error('IPFS error'));

    const result = await getStandardProposal(proposalId, mockConfig);

    expect(result).toBeUndefined(); // Function returns undefined on error
    expect(console.error).toHaveBeenCalledWith(
      `Error fetching standard proposal ${proposalId}:`,
      expect.any(Error) as Error,
    );
  });

  it('should handle contract read errors', async () => {
    const proposalId = 1;
    (mockPublicClient.readContract as jest.Mock).mockRejectedValue(new Error('Contract error'));

    const result = await getStandardProposal(proposalId, mockConfig);

    expect(result).toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle non-IPFS metadata', async () => {
    const proposalId = 1;
    const mockContractResponse = [
      false, // executed
      2n, // approvals
      {
        /* parameters */
      },
      '0x68747470733a2f2f6578616d706c652e636f6d2f6d657461646174612e6a736f6e', // hex for https://example.com/metadata.json
      [], // destinationActions
      '0x0000000000000000000000000000000000000000', // destinationPlugin
    ];

    (mockPublicClient.readContract as jest.Mock).mockResolvedValue(mockContractResponse);
    mockGetIpfsFileSafe.mockRejectedValue(new Error('Not an IPFS URL'));

    const result = await getStandardProposal(proposalId, mockConfig);

    expect(result).toBeUndefined(); // Will fail trying to fetch from non-IPFS URL
    expect(console.error).toHaveBeenCalled();
  });
});
