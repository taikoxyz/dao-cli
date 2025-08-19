import getEmergencyProposal from '../../../../src/api/dao/emergency-proposal/getEmergencyProposal';
import { getPublicClient } from '../../../../src/api/viem';
import getIpfsFile from '../../../../src/api/ipfs/getIpfsFile';
import { INetworkConfig } from '../../../../src/types/network.type';

jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/ipfs/getIpfsFile');

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
const mockGetIpfsFile = getIpfsFile as jest.MockedFunction<typeof getIpfsFile>;

describe('getEmergencyProposal', () => {
  let mockConfig: INetworkConfig;
  let mockPublicClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();

    mockPublicClient = {
      readContract: jest.fn(),
    };
    mockGetPublicClient.mockReturnValue(mockPublicClient);

    mockConfig = {
      network: 'holesky',
      urls: {
        rpc: 'https://rpc.holesky.ethpandaops.io',
        explorer: 'https://holesky.etherscan.io',
      },
      subgraph: 'https://subgraph.holesky.example.com',
      contracts: {
        DAO: '0x1234567890abcdef1234567890abcdef12345678' as any,
        VotingToken: '0x2345678901abcdef2345678901abcdef23456789' as any,
        TaikoBridge: '0x3456789012abcdef3456789012abcdef34567890' as any,
        MultisigPlugin: '0x4567890123abcdef4567890123abcdef45678901' as any,
        EmergencyMultisigPlugin: '0x5678901234abcdef5678901234abcdef56789012' as any,
        OptimisticTokenVotingPlugin: '0x6789012345abcdef6789012345abcdef67890123' as any,
        SignerList: '0x7890123456abcdef7890123456abcdef78901234' as any,
        EncryptionRegistry: '0x8901234567abcdef8901234567abcdef89012345' as any,
        DelegationWall: '0x9012345678abcdef9012345678abcdef90123456' as any,
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch a specific emergency proposal', async () => {
    const proposalId = 1;
    const mockContractResponse = [
      false, // executed
      2n, // approvals
      {
        /* parameters */
      },
      '0x656e637279707465645f646174615f31', // metadataURI (hex for encrypted_data_1)
      [], // destinationActions
      '0x0000000000000000000000000000000000000000', // destinationPlugin
    ];

    const mockMetadata = {
      title: 'Emergency Proposal 1',
      description: 'This is an emergency proposal',
      actions: [],
    };

    mockPublicClient.readContract.mockResolvedValue(mockContractResponse);
    mockGetIpfsFile.mockResolvedValue(mockMetadata);

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toEqual({
      executed: false,
      approvals: 2n,
      parameters: {},
      metadataURI: 'encrypted_data_1',
      destinationActions: [],
      destinationPlugin: '0x0000000000000000000000000000000000000000',
      proposalId: 1,
      ...mockMetadata,
    });
    expect(mockPublicClient.readContract).toHaveBeenCalledWith({
      abi: expect.any(Array),
      address: mockConfig.contracts.EmergencyMultisigPlugin,
      functionName: 'getProposal',
      args: [proposalId],
    });
  });

  it('should return undefined when proposal is not found', async () => {
    const proposalId = 999;

    mockPublicClient.readContract.mockRejectedValue(new Error('Proposal not found'));

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toBeUndefined();
  });

  it('should handle IPFS metadata in emergency proposals', async () => {
    const proposalId = 1;
    const mockContractResponse = [
      false, // executed
      2n, // approvals
      {
        /* parameters */
      },
      '0x697066733a2f2f516d456d657267656e637931', // metadataURI (hex for ipfs://QmEmergency1)
      [], // destinationActions
      '0x0000000000000000000000000000000000000000', // destinationPlugin
    ];

    const mockMetadata = {
      title: 'Emergency Proposal from IPFS',
      description: 'Fetched from IPFS',
    };

    mockPublicClient.readContract.mockResolvedValue(mockContractResponse);
    mockGetIpfsFile.mockResolvedValue(mockMetadata);

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toEqual({
      executed: false,
      approvals: 2n,
      parameters: {},
      metadataURI: 'ipfs://QmEmergency1',
      destinationActions: [],
      destinationPlugin: '0x0000000000000000000000000000000000000000',
      proposalId: 1,
      ...mockMetadata,
    });
    expect(mockGetIpfsFile).toHaveBeenCalledWith('QmEmergency1');
  });

  it('should handle encrypted metadata in emergency proposals', async () => {
    const proposalId = 1;
    const mockContractResponse = [
      false, // executed
      2n, // approvals
      {
        /* parameters */
      },
      '0x656e637279707465645f646174615f746861745f69735f6e6f745f69706673', // hex for encrypted_data_that_is_not_ipfs
      [], // destinationActions
      '0x0000000000000000000000000000000000000000', // destinationPlugin
    ];

    mockPublicClient.readContract.mockResolvedValue(mockContractResponse);
    mockGetIpfsFile.mockRejectedValue(new Error('Not IPFS'));

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toBeUndefined(); // Will fail trying to fetch non-IPFS
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle IPFS fetch errors', async () => {
    const proposalId = 1;
    const mockContractResponse = [
      false, // executed
      2n, // approvals
      {
        /* parameters */
      },
      '0x697066733a2f2f516d456d657267656e637931', // hex for ipfs://QmEmergency1
      [], // destinationActions
      '0x0000000000000000000000000000000000000000', // destinationPlugin
    ];

    mockPublicClient.readContract.mockResolvedValue(mockContractResponse);
    mockGetIpfsFile.mockRejectedValue(new Error('IPFS error'));

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toBeUndefined(); // Function returns undefined on error
    expect(console.error).toHaveBeenCalledWith(`Error fetching emergency proposal ${proposalId}:`, expect.any(Error));
  });

  it('should handle contract read errors', async () => {
    const proposalId = 1;
    mockPublicClient.readContract.mockRejectedValue(new Error('Contract error'));

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
