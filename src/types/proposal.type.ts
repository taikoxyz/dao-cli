import { Hex, Address } from 'viem';

export interface IProposalMetadata {
  id: number;
  title: string;
  summary: string;
  description: string;
  resources: { name: string; url: string }[];
}

export type EncryptedProposalMetadata = {
  encrypted: {
    metadata: string; // base64
    actions: string; // base64
    symmetricKeys: Hex[];
  };
};

export type IProposalResource = {
  name: string;
  url: string;
};

export type ProposalMetadata = {
  title: string;
  summary: string;
  description: string;
  resources: IProposalResource[];
};

export const RawActionListAbi = [
  {
    name: '_actions',
    type: 'tuple[]',
    internalType: 'struct IDAO.Action[]',
    components: [
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
  },
] as const;

export type ProposalInputs = {
  proposalId: bigint;
};

export type EmergencyProposalResultType = readonly [
  executed: boolean,
  approvals: number,
  parameters: EmergencyProposalParameters,
  encryptedPayloadUri: Hex,
  publicMetadataUriHash: Hex,
  destActionsHash: Hex,
  destinationPlugin: Address,
];

export type EmergencyProposalParameters = {
  expirationDate: bigint;
  snapshotBlock: bigint;
  minApprovals: number;
};

export type RawAction = {
  to: Address;
  value: bigint;
  data: Hex;
};

export type EmergencyProposal = {
  // active: boolean;
  executed: boolean;
  parameters: EmergencyProposalParameters;
  approvals: number;
  actions: RawAction[];
  allowFailureMap: bigint;
  creator: string;
  title: string;
  summary: string;
  description: string;
  resources: IProposalResource[];
};

export type ApprovedEvent = {
  proposalId: bigint;
  approver: Address;
};
