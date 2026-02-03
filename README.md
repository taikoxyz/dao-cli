# Taiko DAO CLI

A command-line interface for interacting with the Taiko DAO governance system. This tool provides access to governance proposals, voting delegation, Security Council operations, and direct smart contract interaction across mainnet and Holesky testnet.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Running the CLI](#running-the-cli)
- [Features for All Users](#features-for-all-users)
  - [View Public Proposals](#view-public-proposals)
  - [Veto Proposals](#veto-proposals)
  - [Delegates](#delegates)
  - [Read Smart Contracts](#read-smart-contracts)
- [Features for Security Council Members](#features-for-security-council-members)
  - [Create Proposals](#create-proposals)
  - [Approve and Execute Proposals](#approve-and-execute-proposals)
  - [View Proposals](#view-proposals)
  - [Emergency Proposal Encryption](#emergency-proposal-encryption)
- [CLI Commands Reference](#cli-commands-reference)
- [Environment Variables](#environment-variables)
- [Networks](#networks)
- [Available Contracts](#available-contracts)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [License](#license)

## Installation

### Prerequisites

- Node.js v14.0.0 or higher
- pnpm package manager

### Steps

```bash
git clone https://github.com/taikoxyz/dao-cli taiko-dao-cli
cd taiko-dao-cli
pnpm install
pnpm build
```

## Configuration

### Basic Configuration

Create a `.env` file from the template:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MAINNET_PRIVATE_KEY` | For write operations on mainnet | 32-byte hex private key (with 0x prefix) |
| `HOLESKY_PRIVATE_KEY` | For write operations on Holesky | 32-byte hex private key (with 0x prefix) |
| `PINATA_JWT` | For creating proposals | JWT token from Pinata for IPFS pinning |
| `IPFS_GATEWAY` | No | Custom IPFS gateway URL (defaults to rotating gateway list) |

### Pinata Setup (Required for Proposal Creation)

Security Council members creating proposals must configure IPFS pinning:

1. Sign up at [pinata.cloud](https://pinata.cloud)
2. Navigate to API Keys in your dashboard
3. Create a new key with these permissions:
   - `pinFileToIPFS`: Enabled
   - `pinJSONToIPFS`: Enabled
4. Copy the JWT token to your `.env` file as `PINATA_JWT`
5. Test the configuration:

```bash
pnpm build
pnpm test:ipfs
```

## Running the CLI

```bash
# Connect to mainnet (default)
pnpm start

# Connect to a specific network
pnpm start:mainnet  # Taiko mainnet
pnpm start:holesky  # Holesky testnet
```

The CLI presents an interactive menu that guides you through available features.

## Features for All Users

These features are available without any wallet configuration. Read-only operations work immediately after installation.

### View Public Proposals

Browse governance proposals that have reached the public voting stage.

**How to use:**

1. Select "Public Stage Proposals" from the main menu
2. Select "View Public Proposals"
3. Choose any proposal to view details including:
   - Title and description
   - Voting status and timeline
   - Proposed on-chain actions
   - Current vote counts

### Veto Proposals

Cast veto votes on proposals you disagree with. Requires a configured wallet.

**How to use:**

1. Select "Public Stage Proposals" from the main menu
2. Select "Veto a Public Proposal"
3. Choose the proposal you want to veto
4. Confirm the transaction

### Delegates

The delegation system allows token holders to delegate their voting power to trusted representatives.

#### View Delegates List

Browse all registered delegates and their profiles:

1. Select "Delegates" from the main menu
2. Select "View Delegates List"
3. Choose any delegate to view:
   - Profile information and statement
   - Current voting power
   - Token balance
   - Full metadata

#### Create or Update Delegate Profile

Register as a delegate to represent other token holders:

1. Select "Delegates" from the main menu
2. Select "Create/Update My Delegate Profile"
3. Provide the required information:
   - **Identifier**: Your display name
   - **Content URL**: Link to your delegate statement
   - **Metadata**: JSON object with background information

The profile is stored on the DelegationWall contract and metadata is pinned to IPFS.

#### Delegate Voting Power

Delegate your voting power to a trusted representative:

1. Select "Delegates" from the main menu
2. Select "Delegate My Voting Power"
3. Choose one of:
   - **Delegate to Address**: Enter a specific wallet address
   - **Choose from Registered**: Select from the list of registered delegates
4. Confirm the delegation transaction

Delegation transfers only your voting power, not your tokens. You can change your delegation at any time, and you can still vote directly on proposals to override your delegate's vote.

### Read Smart Contracts

Directly call view functions on any DAO contract:

1. Select "Read Bare Contracts" from the main menu
2. Choose a contract from the list
3. Select a view function to call
4. Enter any required parameters
5. View the result from the blockchain

Common uses:
- Check token balances with `balanceOf`
- Verify delegation status
- Inspect proposal states
- View contract configurations

## Features for Security Council Members

These features require Security Council membership and a configured wallet.

### Prerequisites

1. Configure your agent wallet in `.env`:
   ```
   MAINNET_PRIVATE_KEY=0x...
   HOLESKY_PRIVATE_KEY=0x...
   ```

2. Configure IPFS pinning (see [Pinata Setup](#pinata-setup-required-for-proposal-creation))

### Accessing Security Council Features

1. Select "Security Council" from the main menu
2. The system verifies your membership and displays:
   - Current Security Council members
   - Your agent status
   - Available actions

### Create Proposals

Security Council members can create two types of proposals:

#### Standard Proposals

Regular governance proposals that go through the full governance process:

1. Select "Create New Proposal"
2. Select "Standard Proposal"
3. Enter proposal metadata:
   - **Title**: Clear, descriptive title
   - **Summary**: Brief explanation
   - **Description**: Detailed rationale and implications
   - **Resources** (optional): Related links and documents
4. Define on-chain actions:
   - Token transfers
   - Contract calls
   - Raw transaction data
5. Select the destination plugin
6. Review and confirm

The metadata is pinned to IPFS and the proposal is submitted to the MultisigPlugin contract.

#### Emergency Proposals

Time-sensitive proposals with encrypted content visible only to Security Council members:

1. Select "Create New Proposal"
2. Select "Emergency Proposal"
3. Enter proposal metadata (same as standard)
4. Define on-chain actions
5. Review and confirm

The system automatically:
- Generates a random symmetric encryption key
- Encrypts the proposal metadata and actions
- Fetches public keys from the EncryptionRegistry for all Security Council members
- Encrypts the symmetric key for each member
- Pins the encrypted payload to IPFS
- Submits the proposal to the EmergencyMultisigPlugin contract

### Approve and Execute Proposals

Review and act on pending proposals:

1. Select "Approve/Execute Proposals"
2. Choose proposal type:
   - **Standard Proposals**: Pending Security Council approval
   - **Emergency Proposals**: Urgent proposals with encrypted content
3. Select a proposal from the list
4. Review all details:
   - Metadata and description
   - Proposed actions
   - Current approval count
5. Choose your action:
   - **Approve**: Add your approval
   - **Execute**: Trigger execution (when quorum is reached)
   - **View Details**: Inspect without taking action

### View Proposals

#### View Standard Proposals

Browse all proposals in the Security Council pipeline:

1. Select "View Standard Proposals"
2. Select any proposal to view:
   - Full metadata
   - Proposed actions
   - Approval status
   - Timeline

#### View Emergency Proposals

Access encrypted emergency proposals:

1. Select "View Emergency Proposals"
2. Select a proposal
3. Sign the decryption message when prompted
4. View the decrypted content

### Emergency Proposal Encryption

Emergency proposals use end-to-end encryption to protect sensitive information.

#### Encryption Setup (One-time)

Security Council members must register their encryption public key:

1. The CLI prompts you to sign a deterministic message
2. A keypair is derived from your signature
3. The public key is stored in the EncryptionRegistry contract

#### Decryption Process

When viewing an emergency proposal:

1. Sign the decryption message when prompted
2. The CLI derives your private key from the signature
3. The symmetric key is decrypted using your keypair
4. The proposal content is decrypted and verified against on-chain hashes
5. Full proposal details are displayed

#### Technical Details

- **Symmetric encryption**: XSalsa20 stream cipher with Poly1305 MAC (AES-256-GCM equivalent security)
- **Asymmetric encryption**: X25519 key exchange with XSalsa20-Poly1305
- **Key derivation**: Deterministic keypairs from wallet signatures
- **Verification**: On-chain hashes verify decrypted content integrity

## CLI Commands Reference

### npm Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Launch CLI with interactive network selection |
| `pnpm start:mainnet` | Launch CLI connected to mainnet |
| `pnpm start:holesky` | Launch CLI connected to Holesky testnet |
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm dev` | Build and run in one command |
| `pnpm test` | Run test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm test:ipfs` | Test IPFS/Pinata configuration |
| `pnpm lint` | Run ESLint with auto-fix |
| `pnpm format` | Format code with Prettier |

### Main Menu Options

| Option | Description | Requirements |
|--------|-------------|--------------|
| Public Stage Proposals | View and veto public proposals | None (veto requires wallet) |
| Security Council | Create, approve, execute proposals | SC membership + wallet |
| Delegates | View delegates, create profile, delegate voting power | Profile/delegation requires wallet |
| Read Bare Contracts | Call view functions on contracts | None |
| Exit | Close the CLI | None |

## Environment Variables

Complete `.env` file reference:

```bash
# Private keys for signing transactions
# Required for: delegation, voting, Security Council operations
MAINNET_PRIVATE_KEY=0x...
HOLESKY_PRIVATE_KEY=0x...

# IPFS pinning via Pinata
# Required for: creating proposals, creating delegate profiles
PINATA_JWT=eyJ...

# Custom IPFS gateway (optional)
# Default: rotating list of public gateways
IPFS_GATEWAY=https://ipfs.io/ipfs
```

## Networks

### Mainnet

- **Chain ID**: 1
- **Purpose**: Live Taiko governance with real TAIKO tokens
- **RPC**: https://eth.llamarpc.com
- **Explorer**: https://etherscan.io

### Holesky Testnet

- **Chain ID**: 17000
- **Purpose**: Testing environment with test tokens
- **Use for**: Learning the system, testing proposals, training

New users should start with Holesky to familiarize themselves with the system before participating on mainnet.

## Available Contracts

The CLI provides access to these governance contracts:

| Contract | Purpose |
|----------|---------|
| DAO | Core governance contract |
| VotingToken | ERC20Votes token for governance participation |
| TaikoBridge | Cross-chain bridge operations |
| MultisigPlugin | Standard proposal management |
| EmergencyMultisigPlugin | Emergency proposal management |
| OptimisticTokenVotingPlugin | Public voting mechanism |
| SignerList | Security Council membership registry |
| EncryptionRegistry | Public key storage for emergency proposals |
| DelegationWall | Delegate profile registry |

Contract addresses are configured per network in `src/config/mainnet.config.json` and `src/config/holesky.config.json`.

## Development

### Building

```bash
pnpm build
```

### Development Mode

```bash
pnpm dev  # Builds and runs
```

### Code Quality

```bash
pnpm lint    # ESLint with auto-fix
pnpm format  # Prettier formatting
```

### Project Structure

```
src/
  index.ts                 # Entry point
  config/                  # Network configurations
  abi/                     # Contract ABIs
  api/
    web3/                  # Wallet connectivity
    dao/                   # DAO operations
      public-proposal/     # Public voting proposals
      standard-proposal/   # Standard SC proposals
      emergency-proposal/  # Emergency SC proposals
      security-council/    # SC operations
      delegates/           # Delegation system
    encryption/            # Cryptographic operations
    ipfs/                  # IPFS integration
    subgraph/              # GraphQL queries
    cache/                 # Data caching
  cli/                     # Interactive prompts
  types/                   # TypeScript interfaces
  util/                    # Utility functions
tests/                     # Test suite
docs/                      # Additional documentation
```

## Testing

### Run All Tests

```bash
pnpm test
```

### Watch Mode

```bash
pnpm test:watch
```

### Coverage Report

```bash
pnpm test:coverage
```

### Test IPFS Configuration

```bash
pnpm test:ipfs
```

## Troubleshooting

### "Failed to connect ENV wallet" Warning

This warning appears when no private key is configured in `.env`. It is normal for read-only usage. Configure a private key only when you need to:
- Delegate voting power
- Vote on proposals
- Access Security Council features

### IPFS Pinning Failures

1. Verify `PINATA_JWT` is correct and complete
2. Check Pinata account quota (100 pins/month on free tier)
3. Run `pnpm test:ipfs` to diagnose
4. Ensure JWT has `pinFileToIPFS` and `pinJSONToIPFS` permissions

### "NOT an appointed agent" Error

1. Verify the private key in `.env` corresponds to a Security Council member address
2. Confirm you are connected to the correct network (mainnet vs Holesky)
3. Check that your address is actually appointed in the SignerList contract

### Network Connectivity Issues

1. Check your internet connection
2. Try switching networks
3. Verify the RPC endpoint is accessible
4. IPFS gateways may be temporarily unavailable

### Encrypted Proposal Decryption Failed

1. Verify your wallet address matches the registered encryption key
2. Try signing the decryption message again
3. Confirm the proposal was encrypted for your public key
4. Check that your public key is registered in the EncryptionRegistry

### Cache Issues

The CLI caches subgraph data for performance. If you see stale data:
- Cache clears automatically when switching networks
- Recent proposals may take a few minutes to appear

## Architecture

### Dependencies

| Package | Purpose |
|---------|---------|
| viem | Ethereum client and wallet management |
| @inquirer/prompts | Interactive CLI prompts |
| inquirer | Menu and selection interface |
| axios | HTTP client for Pinata API |
| graphql-request | GraphQL client for subgraph queries |
| libsodium-wrappers | Cryptographic operations |
| dotenv | Environment variable management |

### Data Flow

1. **Subgraph queries**: Fetch proposal and delegate data from Goldsky GraphQL API
2. **IPFS resolution**: Retrieve metadata from IPFS gateways
3. **Contract reads**: Direct RPC calls via viem
4. **Contract writes**: Transaction simulation followed by execution
5. **Caching**: Local filesystem cache for performance optimization

### Security Model

- **Private keys**: Stored in `.env` file, never transmitted
- **Encryption**: libsodium-based cryptography for emergency proposals
- **IPFS**: Content-addressed storage with on-chain hash verification
- **Transaction safety**: All write operations are simulated before execution

## License

MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome. Please open issues and pull requests at [github.com/taikoxyz/dao-cli](https://github.com/taikoxyz/dao-cli).

## Additional Documentation

- [User Guide](docs/USER_GUIDE.md) - Detailed guide for general users
- [Security Council Guide](docs/SECURITY_COUNCIL_GUIDE.md) - Advanced features for Security Council members
- [Pinata Setup](docs/PINATA_SETUP.md) - IPFS configuration details
- [Emergency Proposal Encryption](docs/EMERGENCY_PROPOSAL_ENCRYPTION.md) - Technical encryption documentation
