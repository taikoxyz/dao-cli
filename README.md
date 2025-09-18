# Taiko DAO CLI

A command-line interface for seamless interaction with the Taiko DAO governance system, providing comprehensive access to proposals, delegation, and Security Council operations.

## Quick Start

### Installation

```bash
git clone https://github.com/taikoxyz/dao-cli taiko-dao-cli
cd taiko-dao-cli
pnpm install
pnpm build
```

### Running the CLI

```bash
# Interactive network selection
pnpm start

# Direct to specific networks
pnpm start:mainnet  # Taiko mainnet
pnpm start:holesky  # Holesky testnet
```

That's it! The CLI will guide you through available features and any additional setup needed.

## What You Can Do

### 🗳️ For All Users
- **View Public Proposals:** Browse active governance proposals
- **Explore Delegates:** See who represents the community
- **Read Contracts:** Inspect on-chain governance data
- **Delegate Voting Power:** Amplify your governance participation

### 🔒 For Security Council Members
- **Create Proposals:** Submit standard and emergency proposals
- **Approve & Execute:** Manage the proposal pipeline
- **Access Encrypted Content:** View sensitive emergency proposals

## Prerequisites

- Node.js (v14.0.0 or higher)
- pnpm package manager

## Documentation

- **📖 [User Guide](docs/USER_GUIDE.md)** - Complete guide for general users, delegation, and governance participation
- **🔐 [Security Council Guide](docs/SECURITY_COUNCIL_GUIDE.md)** - Advanced features for Security Council members
- **📌 [Pinata Setup](docs/PINATA_SETUP.md)** - IPFS configuration for proposal creation
- **🔒 [Emergency Proposal Encryption](docs/EMERGENCY_PROPOSAL_ENCRYPTION.md)** - Technical details on proposal encryption

## Networks

- **Mainnet:** Live Taiko governance with real TAIKO tokens
- **Holesky Testnet:** Safe testing environment with test tokens

**New users:** Start with Holesky to learn the system risk-free!

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
pnpm test:ipfs      # Test IPFS configuration
```

### Code Quality

```bash
pnpm lint    # Run ESLint with auto-fix
pnpm format  # Format code with Prettier
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests to the [repository](https://github.com/taikoxyz/dao-cli).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions, please open an issue on [GitHub](https://github.com/taikoxyz/dao-cli/issues).