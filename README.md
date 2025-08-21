# Taiko DAO CLI

A command-line interface for seamless interaction with the Taiko DAO governance system, providing comprehensive access to proposals, delegation, and Security Council operations.

## Overview

The Taiko DAO CLI is a TypeScript-based tool that enables users to interact with the Taiko DAO smart contracts directly from the terminal. It supports both mainnet and testnet (Holesky) environments, offering functionality for proposal management, delegate operations, and Security Council member activities.

## Prerequisites

- Node.js (v14.0.0 or higher)
- pnpm package manager

## Installation

```bash
git clone https://github.com/taikoxyz/dao-cli taiko-dao-cli
cd taiko-dao-cli
pnpm install
pnpm build
```

## Configuration

### Security Council Members

Security Council members must configure their agent wallet to access privileged operations. Create a `.env` file from the provided template:

```bash
cp .env.example .env
```

Add your private key to the `.env` file. This requirement will be replaced with a more secure wallet connectivity solution in future releases.

### IPFS Configuration for Proposals

To create proposals, you must configure IPFS pinning using Pinata to store proposal metadata:

1. Sign up for a free account at [pinata.cloud](https://pinata.cloud)
2. Go to the API Keys section in your dashboard
3. Generate a new JWT (JSON Web Token)
4. Add to your `.env` file:
   ```
   PINATA_JWT=your_jwt_token
   ```

#### Testing IPFS Configuration
After configuration, test your IPFS setup:
```bash
pnpm build
pnpm test:ipfs
```

## Usage

### Quick Start

```bash
# Start with network selection prompt
pnpm start

# Start with specific network (bypasses selection)
pnpm start:mainnet
pnpm start:holesky
```

### Features

The CLI provides access to the following modules:

| Module | Description | Requirements |
|--------|-------------|--------------|
| **Public Stage Proposals** | Browse and inspect proposals in the public voting stage | None |
| **Security Council** | Access pre-public stage proposals and privileged operations | Agent private key in `.env` |
| **Delegates** | View delegate profiles and analyze voting power distribution | None |
| **Read Bare Contracts** | Direct interaction with DAO smart contract methods | None |

## Development

### Build from Source

```bash
pnpm build
```

### Testing

```bash
pnpm test           # Run test suite
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Generate coverage report
```

### Code Quality

```bash
pnpm lint    # Run ESLint with auto-fix
pnpm format  # Format code with Prettier
```

## Roadmap

- [x] **v1.0.0 - Core Foundation**
    - [x] Multi-network support (Mainnet, Holesky)
    - [x] Direct contract interaction interface
    - [x] Security Council proposal decryption

- [x] **v1.1.0 - Enhanced Visibility**
    - [x] Public-stage proposal reading
    - [x] Delegate profile exploration
    - [x] Voting power visualization

- [x] **v1.2.0 - Security Council Operations**
    - [x] Comprehensive documentation
    - [x] MIT License adoption
    - [x] Proposal creation for SC members (standard and emergency)
    - [x] IPFS metadata pinning integration
    - [x] Proposal approval workflow

- [ ] **v1.3.0 - Delegation & Governance**
    - [ ] Secure wallet connectivity without explicit private keys
    - [x] Delegate profile management
    - [x] Voting power delegation
    - [x] Public-stage proposal veto capabilities

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests to the [repository](https://github.com/taikoxyz/dao-cli).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions, please open an issue on [GitHub](https://github.com/taikoxyz/dao-cli/issues).