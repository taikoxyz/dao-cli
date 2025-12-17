import { createWalletClient, custom, WalletClient, Address } from 'viem';
import { holesky, mainnet } from 'viem/chains';
import { INetworkConfig } from '../../types/network.type';

/**
 * Frame wallet connection for hardware wallet support (Ledger/Trezor).
 *
 * Frame is a system-wide wallet that acts as a bridge to hardware wallets.
 * It exposes a local JSON-RPC endpoint at http://127.0.0.1:1248 that can be
 * used by any application to request signatures from connected hardware wallets.
 *
 * Prerequisites:
 * 1. Install Frame: https://frame.sh
 * 2. Connect your hardware wallet (Ledger/Trezor) to Frame
 * 3. Ensure Frame is running and the wallet is unlocked
 *
 * Frame supports:
 * - Ledger (Nano S, Nano X, Nano S Plus)
 * - Trezor (Model One, Model T)
 * - Grid+ Lattice1
 * - Local hot wallets (for testing)
 */

const FRAME_RPC_URL = 'http://127.0.0.1:1248';

interface FrameRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

class FrameRpcError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = 'FrameRpcError';
  }
}

async function frameRpcRequest<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(FRAME_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Frame RPC request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as FrameRpcResponse<T>;

  if (data.error) {
    throw new FrameRpcError(data.error.message, data.error.code);
  }

  return data.result as T;
}

/**
 * Check if Frame wallet is available and running.
 * Returns true if Frame is running, even if no account is selected.
 */
export async function isFrameAvailable(): Promise<boolean> {
  try {
    await frameRpcRequest<string[]>('eth_accounts');
    return true;
  } catch (error) {
    // Error code 4001 means Frame is running but no account selected - that's still "available"
    if (error instanceof FrameRpcError && error.code === 4001) {
      return true;
    }
    return false;
  }
}

/**
 * Get accounts from Frame wallet.
 * Returns empty array if no account is selected.
 */
export async function getFrameAccounts(): Promise<Address[]> {
  try {
    const accounts = await frameRpcRequest<string[]>('eth_accounts');
    return accounts as Address[];
  } catch (error) {
    // Error code 4001 means no account selected
    if (error instanceof FrameRpcError && error.code === 4001) {
      return [];
    }
    throw error;
  }
}

/**
 * Request Frame to switch to the correct chain
 */
async function switchFrameChain(chainId: number): Promise<void> {
  const chainIdHex = `0x${chainId.toString(16)}`;

  try {
    await frameRpcRequest('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
  } catch (error: unknown) {
    // If chain is not added, try to add it
    const err = error as { message?: string };
    if (err.message?.includes('Unrecognized chain') || err.message?.includes('chain not found')) {
      throw new Error(`Chain ${chainId} not configured in Frame. Please add the network in Frame settings.`);
    }
    throw error;
  }
}

/**
 * Create a custom EIP-1193 provider for Frame
 */
function createFrameProvider() {
  return {
    async request({ method, params }: { method: string; params?: unknown[] }) {
      return frameRpcRequest(method, params || []);
    },
  };
}

/**
 * Connect to Frame wallet for hardware wallet support.
 *
 * @param config - Network configuration
 * @returns WalletClient connected to Frame
 * @throws Error if Frame is not running or no accounts are available
 */
export default async function connectFrameWallet(config: INetworkConfig): Promise<WalletClient> {
  // Check if Frame is available
  const available = await isFrameAvailable();
  if (!available) {
    throw new Error(
      'Frame wallet is not available. Please ensure Frame is installed and running.\n' +
        'Download Frame at: https://frame.sh',
    );
  }

  // Get accounts from Frame
  const accounts = await getFrameAccounts();
  if (accounts.length === 0) {
    throw new Error(
      'No account selected in Frame. Please:\n' +
        '  1. Open Frame (click the Frame icon in your menu bar)\n' +
        '  2. Connect your hardware wallet (Ledger/Trezor) if not already connected\n' +
        '  3. Click on an account to select it as active',
    );
  }

  // Switch to the correct chain
  await switchFrameChain(config.chainId);

  // Create wallet client with Frame provider
  const walletClient = createWalletClient({
    account: accounts[0],
    chain: config.network === 'holesky' ? holesky : mainnet,
    transport: custom(createFrameProvider()),
  });

  return walletClient;
}
