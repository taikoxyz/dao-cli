import { Abi } from 'viem';
import { default as Dao } from './DAO.sol/DAO.json';
import { default as DelegationWall } from './DelegationWall.sol/DelegationWall.json';
import { default as EmergencyMultisig } from './EmergencyMultisig.sol/EmergencyMultisig.json';
import { default as EncryptionRegistry } from './EncryptionRegistry.sol/EncryptionRegistry.json';
import { default as Multisig } from './Multisig.sol/Multisig.json';
import { default as OptimisticTokenVotingPlugin } from './OptimisticTokenVotingPlugin.sol/OptimisticTokenVotingPlugin.json';
import { default as SignerList } from './SignerList.sol/SignerList.json';

export const ABIs: Record<string, any[]> = {
  DAO: Dao.abi,
  DelegationWall: DelegationWall.abi,
  EmergencyMultisigPlugin: EmergencyMultisig.abi,
  EncryptionRegistry: EncryptionRegistry.abi,
  MultisigPlugin: Multisig.abi,
  OptimisticTokenVotingPlugin: OptimisticTokenVotingPlugin.abi,
  SignerList: SignerList.abi,
};
