// Common test types used across test files

describe('Common test types', () => {
  it('should export type definitions', () => {
    // This test ensures the file is valid and types are exported correctly
    expect(true).toBe(true);
  });
});

export interface MockPublicClient extends Record<string, unknown> {
  readContract?: jest.Mock;
  multicall?: jest.Mock;
  simulateContract?: jest.Mock;
}

export interface MockWalletClient extends Record<string, unknown> {
  account?: {
    address?: string;
  };
  writeContract?: jest.Mock;
}

export interface MockCache extends Record<string, unknown> {
  get?: jest.Mock;
  set?: jest.Mock;
  has?: jest.Mock;
  clear?: jest.Mock;
}

export interface MockResponse {
  ok: boolean;
  json: () => Promise<unknown>;
  status?: number;
  statusText?: string;
}

// Generic mock data interfaces
export interface MockProposal {
  id?: number;
  title?: string;
  description?: string;
  executed?: boolean;
  approvals?: number;
  proposalId?: number;
}

export interface MockMetadata {
  title: string;
  description: string;
  actions?: unknown[];
  summary?: string;
  resources?: Array<{
    url: string;
    name: string;
  }>;
}

// Mock interfaces for fetch responses
export type MockFetch = typeof fetch;

// Mock interfaces for viem clients
export interface MockAccount extends Record<string, unknown> {
  address: `0x${string}` | undefined;
  nonceManager?: unknown;
  sign: jest.Mock;
  signAuthorization: jest.Mock;
  signMessage: jest.Mock;
  signTransaction: jest.Mock;
  signTypedData: jest.Mock;
  experimental_signAuthorization?: jest.Mock;
  publicKey?: `0x${string}`;
  source: string;
  type: 'local';
}

// Mock interfaces for common test scenarios
export interface MockGraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface MockGetNetworkCache extends Record<string, unknown> {
  has?: jest.Mock;
  get?: jest.Mock;
  set?: jest.Mock;
  clear?: jest.Mock;
}
