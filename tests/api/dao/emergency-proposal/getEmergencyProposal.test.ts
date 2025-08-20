import getEmergencyProposal from '../../../../src/api/dao/emergency-proposal/getEmergencyProposal';
import { getPublicClient } from '../../../../src/api/viem';
import getIpfsFile from '../../../../src/api/ipfs/getIpfsFile';
import { INetworkConfig } from '../../../../src/types/network.type';
import { MockPublicClient } from '../../../types/common.test';

jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/ipfs/getIpfsFile');

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
const mockGetIpfsFile = getIpfsFile as jest.MockedFunction<typeof getIpfsFile>;

describe('getEmergencyProposal', () => {
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

    (mockPublicClient.readContract as jest.Mock).mockResolvedValue(mockContractResponse);
    mockGetIpfsFile.mockResolvedValue(mockMetadata);

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toEqual({
      executed: false,
      approvals: 2n,
      parameters: {},
      encryptedPayloadURI: 'encrypted_data_1',
      publicMetadataUriHash: [],
      destinationActionsHash: '0x0000000000000000000000000000000000000000',
      destinationPlugin: undefined,
      proposalId: 1,
      title: '[Encrypted]',
      summary: 'This proposal is encrypted for Security Council members',
      description: 'You must be a Security Council member to view this proposal',
    });
    expect(mockPublicClient.readContract).toHaveBeenCalledWith({
      abi: expect.any(Array) as unknown[],
      address: mockConfig.contracts.EmergencyMultisigPlugin,
      functionName: 'getProposal',
      args: [proposalId],
    });
  });

  it('should return undefined when proposal is not found', async () => {
    const proposalId = 999;

    (mockPublicClient.readContract as jest.Mock).mockRejectedValue(new Error('Proposal not found'));

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

    (mockPublicClient.readContract as jest.Mock).mockResolvedValue(mockContractResponse);
    mockGetIpfsFile.mockResolvedValue(mockMetadata);

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toEqual({
      executed: false,
      approvals: 2n,
      parameters: {},
      encryptedPayloadURI: 'ipfs://QmEmergency1',
      publicMetadataUriHash: [],
      destinationActionsHash: '0x0000000000000000000000000000000000000000',
      destinationPlugin: undefined,
      proposalId: 1,
      title: '[Encrypted]',
      summary: 'This proposal is encrypted for Security Council members',
      description: 'You must be a Security Council member to view this proposal',
    });
    // IPFS is not called for emergency proposals - they use encrypted payloads
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

    (mockPublicClient.readContract as jest.Mock).mockResolvedValue(mockContractResponse);
    mockGetIpfsFile.mockRejectedValue(new Error('Not IPFS'));

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toBeDefined(); // Returns encrypted placeholder data
    expect(result?.title).toBe('[Encrypted]');
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

    (mockPublicClient.readContract as jest.Mock).mockResolvedValue(mockContractResponse);
    mockGetIpfsFile.mockRejectedValue(new Error('IPFS error'));

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toBeDefined(); // Returns encrypted placeholder data even on IPFS errors
    expect(result?.title).toBe('[Encrypted]');
  });

  it('should handle contract read errors', async () => {
    const proposalId = 1;
    (mockPublicClient.readContract as jest.Mock).mockRejectedValue(new Error('Contract error'));

    const result = await getEmergencyProposal(proposalId, mockConfig);

    expect(result).toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
