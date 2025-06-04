import { Address } from 'viem';

export interface INetworkConfig {
  network: string;
  urls: {
    rpc: string;
    explorer: string;
  };
  contracts: {
    DAO: Address;
    VotingToken: Address;
    TaikoBridge: Address;
    MultisigPlugin: Address;
    EmergencyMultisigPlugin: Address;
    OptimisticTokenVotingPlugin: Address;
    SignerList: Address;
    EncryptionRegistry: Address;
    DelegationWall: Address;
  };
}
