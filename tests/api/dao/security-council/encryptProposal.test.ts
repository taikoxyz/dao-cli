import { encryptEmergencyProposal } from '../../../../src/api/dao/security-council/encryptProposal';
import { INetworkConfig } from '../../../../src/types/network.type';
import * as encryptionModule from '../../../../src/api/encryption';
import * as pinToIpfs from '../../../../src/api/ipfs/pinToIpfs';
import * as getSecurityCouncilMembers from '../../../../src/api/dao/security-council/getSecurityCouncilMembers';
import { getPublicClient } from '../../../../src/api/viem';

jest.mock('../../../../src/api/encryption');
jest.mock('../../../../src/api/ipfs/pinToIpfs');
jest.mock('../../../../src/api/dao/security-council/getSecurityCouncilMembers');
jest.mock('../../../../src/api/viem');

describe('encryptEmergencyProposal', () => {
  let mockConfig: INetworkConfig;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
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

    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should encrypt emergency proposal successfully', async () => {
    const metadata = {
      title: 'Emergency Proposal',
      description: 'Test emergency proposal',
    };
    const actions = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        value: 0n,
        data: '0xdata' as `0x${string}`,
      },
    ];
    const mockMembers = [
      {
        owner: '0xowner1' as `0x${string}`,
        signer: '0xsigner1' as `0x${string}`,
      },
      {
        owner: '0xowner2' as `0x${string}`,
        signer: '0xsigner2' as `0x${string}`,
      },
    ];
    const mockPublicKeys = [
      '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    ];
    const mockSymmetricKey = new Uint8Array([1, 2, 3, 4]);
    const mockEncryptedMetadata = 'encryptedMetadata';
    const mockEncryptedActions = 'encryptedActions';
    const mockEncryptedKeys = ['encryptedKey1', 'encryptedKey2'];
    const mockIpfsHash = 'QmTestHash123';

    const mockPublicClient = {
      readContract: jest
        .fn()
        .mockResolvedValueOnce(['0xagent1', mockPublicKeys[0]])
        .mockResolvedValueOnce(['0xagent2', mockPublicKeys[1]]),
    };

    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getSecurityCouncilMembers.default as jest.Mock).mockResolvedValue(mockMembers);
    (encryptionModule.encryptProposal as jest.Mock).mockReturnValue({
      encrypted: {
        metadata: mockEncryptedMetadata,
        actions: mockEncryptedActions,
      },
      symmetricKey: mockSymmetricKey,
    });
    (encryptionModule.encryptSymmetricKey as jest.Mock).mockReturnValue(mockEncryptedKeys);
    (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue(mockIpfsHash);

    const result = await encryptEmergencyProposal(mockConfig, metadata, actions);

    expect(result).toEqual({
      encryptedPayloadURI: `ipfs://${mockIpfsHash}`,
      publicMetadataUriHash: expect.any(String),
      destinationActionsHash: expect.any(String),
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith('🔐 Encrypting emergency proposal...');
    expect(consoleInfoSpy).toHaveBeenCalledWith('Found 2 Security Council members');
    expect(consoleInfoSpy).toHaveBeenCalledWith('✅ Found public keys for 2 members');
  });

  it('should handle members without public keys', async () => {
    const metadata = { title: 'Test' };
    const actions = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        value: 0n,
        data: '0xdata' as `0x${string}`,
      },
    ];
    const mockMembers = [
      {
        owner: '0xowner1' as `0x${string}`,
        signer: '0xsigner1' as `0x${string}`,
      },
      {
        owner: '0xowner2' as `0x${string}`,
        signer: '0xsigner2' as `0x${string}`,
      },
    ];

    const mockPublicClient = {
      readContract: jest
        .fn()
        .mockResolvedValueOnce(['0xagent1', '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'])
        .mockResolvedValueOnce([
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ]),
    };

    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getSecurityCouncilMembers.default as jest.Mock).mockResolvedValue(mockMembers);
    (encryptionModule.encryptProposal as jest.Mock).mockReturnValue({
      encrypted: { metadata: 'enc', actions: 'enc' },
      symmetricKey: new Uint8Array([1]),
    });
    (encryptionModule.encryptSymmetricKey as jest.Mock).mockReturnValue(['encKey']);
    (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue('QmHash');

    const result = await encryptEmergencyProposal(mockConfig, metadata, actions);

    expect(result).toBeDefined();
    expect(consoleInfoSpy).toHaveBeenCalledWith('✅ Found public keys for 1 members');
  });

  it('should throw error when no members found', async () => {
    const metadata = { title: 'Test' };
    const actions = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        value: 0n,
        data: '0xdata' as `0x${string}`,
      },
    ];

    (getSecurityCouncilMembers.default as jest.Mock).mockResolvedValue([]);

    await expect(encryptEmergencyProposal(mockConfig, metadata, actions)).rejects.toThrow(
      'No Security Council members have registered public keys. Cannot create encrypted proposal.',
    );
  });

  it('should throw error when no valid public keys found', async () => {
    const metadata = { title: 'Test' };
    const actions = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        value: 0n,
        data: '0xdata' as `0x${string}`,
      },
    ];
    const mockMembers = [
      {
        owner: '0xowner1' as `0x${string}`,
        signer: '0xsigner1' as `0x${string}`,
      },
    ];

    const mockPublicClient = {
      readContract: jest
        .fn()
        .mockResolvedValue([
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ]),
    };

    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getSecurityCouncilMembers.default as jest.Mock).mockResolvedValue(mockMembers);

    await expect(encryptEmergencyProposal(mockConfig, metadata, actions)).rejects.toThrow(
      'No Security Council members have registered public keys. Cannot create encrypted proposal.',
    );

    // Warning message should be logged
  });

  it('should handle IPFS pinning errors', async () => {
    const metadata = { title: 'Test' };
    const actions = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        value: 0n,
        data: '0xdata' as `0x${string}`,
      },
    ];
    const mockMembers = [
      {
        owner: '0xowner1' as `0x${string}`,
        signer: '0xsigner1' as `0x${string}`,
      },
    ];

    const mockPublicClient = {
      readContract: jest
        .fn()
        .mockResolvedValue(['0xagent', '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef']),
    };

    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getSecurityCouncilMembers.default as jest.Mock).mockResolvedValue(mockMembers);
    (encryptionModule.encryptProposal as jest.Mock).mockReturnValue({
      encrypted: { metadata: 'enc', actions: 'enc' },
      symmetricKey: new Uint8Array([1]),
    });
    (encryptionModule.encryptSymmetricKey as jest.Mock).mockReturnValue(['encKey']);
    (pinToIpfs.pinJsonToIpfs as jest.Mock).mockRejectedValue(new Error('IPFS error'));

    await expect(encryptEmergencyProposal(mockConfig, metadata, actions)).rejects.toThrow('IPFS error');
  });

  it('should handle encryption errors', async () => {
    const metadata = { title: 'Test' };
    const actions = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        value: 0n,
        data: '0xdata' as `0x${string}`,
      },
    ];
    const mockMembers = [
      {
        owner: '0xowner1' as `0x${string}`,
        signer: '0xsigner1' as `0x${string}`,
      },
    ];

    const mockPublicClient = {
      readContract: jest
        .fn()
        .mockResolvedValue(['0xagent', '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef']),
    };

    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getSecurityCouncilMembers.default as jest.Mock).mockResolvedValue(mockMembers);
    (encryptionModule.encryptProposal as jest.Mock).mockImplementation(() => {
      throw new Error('Encryption failed');
    });

    await expect(encryptEmergencyProposal(mockConfig, metadata, actions)).rejects.toThrow('Encryption failed');
  });

  it('should handle multiple members with mixed public key availability', async () => {
    const metadata = { title: 'Test' };
    const actions = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        value: 0n,
        data: '0xdata' as `0x${string}`,
      },
    ];
    const mockMembers = [
      { owner: '0xowner1' as `0x${string}`, signer: '0xsigner1' as `0x${string}` },
      { owner: '0xowner2' as `0x${string}`, signer: '0xsigner2' as `0x${string}` },
      { owner: '0xowner3' as `0x${string}`, signer: '0xsigner3' as `0x${string}` },
    ];

    const mockPublicClient = {
      readContract: jest
        .fn()
        .mockResolvedValueOnce(['0xagent1', '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'])
        .mockResolvedValueOnce([
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ])
        .mockResolvedValueOnce(['0xagent3', '0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef']),
    };

    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getSecurityCouncilMembers.default as jest.Mock).mockResolvedValue(mockMembers);
    (encryptionModule.encryptProposal as jest.Mock).mockReturnValue({
      encrypted: { metadata: 'enc', actions: 'enc' },
      symmetricKey: new Uint8Array([1]),
    });
    (encryptionModule.encryptSymmetricKey as jest.Mock).mockReturnValue(['encKey1', 'encKey3']);
    (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue('QmHash');

    const result = await encryptEmergencyProposal(mockConfig, metadata, actions);

    expect(result).toBeDefined();
    expect(consoleInfoSpy).toHaveBeenCalledWith('✅ Found public keys for 2 members');
  });

  it('should handle complex metadata structures', async () => {
    const metadata = {
      title: 'Complex Proposal',
      description: 'Test description',
      nested: {
        deep: {
          value: 123,
        },
      },
      array: [1, 2, 3],
    };
    const actions = [
      {
        to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        value: 100n,
        data: '0xdata1' as `0x${string}`,
      },
      {
        to: '0x2345678901bcdef2345678901bcdef2345678901' as `0x${string}`,
        value: 200n,
        data: '0xdata2' as `0x${string}`,
      },
    ];
    const mockMembers = [{ owner: '0xowner1' as `0x${string}`, signer: '0xsigner1' as `0x${string}` }];

    const mockPublicClient = {
      readContract: jest
        .fn()
        .mockResolvedValue(['0xagent', '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef']),
    };

    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getSecurityCouncilMembers.default as jest.Mock).mockResolvedValue(mockMembers);
    (encryptionModule.encryptProposal as jest.Mock).mockReturnValue({
      encrypted: { metadata: 'enc', actions: 'enc' },
      symmetricKey: new Uint8Array([1]),
    });
    (encryptionModule.encryptSymmetricKey as jest.Mock).mockReturnValue(['encKey']);
    (pinToIpfs.pinJsonToIpfs as jest.Mock).mockResolvedValue('QmHash');

    const result = await encryptEmergencyProposal(mockConfig, metadata, actions);

    expect(result).toBeDefined();
    expect(encryptionModule.encryptProposal).toHaveBeenCalledWith(JSON.stringify(metadata), expect.any(Uint8Array));
  });
});
