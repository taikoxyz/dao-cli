export interface SubgraphStandardProposal {
  id: string;
  creator: string;
  metadata: string;
  startDate: string;
  endDate: string;
  contractEventId: string;
  creationBlockNumber: string;
}

export interface SubgraphEmergencyProposal {
  id: string;
  creator: string;
  encryptedPayloadURI: string;
  approvers: { id: string }[];
  contractEventId: string;
  creationBlockNumber: string;
}

export interface SubgraphOptimisticProposal {
  id: string;
  creator: string;
  metadata: string;
  startDate: string;
  endDate: string;
  creatorAddress: string;
  contractEventId: string;
  creationBlockNumber: string;
}

export interface SubgraphProposalMixin {
  id: string;
  proposalId: string;
  metadata: string;
  creator: string;
  isEmergency: boolean;
  isStandard: boolean;
  isOptimistic: boolean;
  approvers?: { id: string }[];
  executor?: {
    id: string;
  };
  vetoes?: {
    id: string;
    voter: string;
    timestamp: string;
  }[];
  creationTxHash: string;
  creationBlockNumber: string;
  executionBlockNumber: string | null;
  executionTxHash: string | null;
}

export interface SubgraphSecurityCouncilMember {
  id: string;
  address: string;
  addedAt: string;
  removedAt: string | null;
  isActive: boolean;
}
