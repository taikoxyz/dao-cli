# Taiko DAO CLI - Security Council Guide

This guide covers advanced functionality available to Security Council members, including proposal creation, approval workflows, and emergency procedures.

## Prerequisites for Security Council Members

### 1. Agent Wallet Configuration

Security Council members must configure their agent wallet to access privileged operations:

```bash
# Create .env file from template
cp .env.example .env

# Add your private key
MAINNET_PRIVATE_KEY=your_mainnet_private_key
HOLESKY_PRIVATE_KEY=your_holesky_private_key
```

**Security Note:** This private key requirement will be replaced with secure wallet connectivity in future releases.

### 2. IPFS Configuration (Required for Proposal Creation)

To create proposals, configure IPFS pinning using Pinata:

1. **Get Pinata JWT:**
   - Sign up at [pinata.cloud](https://pinata.cloud)
   - Generate API key with `pinFileToIPFS` and `pinJSONToIPFS` permissions
   - Copy the JWT token

2. **Configure CLI:**
   ```bash
   # Add to your .env file
   PINATA_JWT=your_jwt_token_here
   ```

3. **Test Configuration:**
   ```bash
   pnpm build
   pnpm test:ipfs
   ```

For detailed IPFS setup instructions, see the [Pinata Setup Guide](PINATA_SETUP.md).

## Security Council Features

### 🔒 Accessing Security Council Module

1. Launch the CLI: `pnpm start`
2. Select "Security Council" from the main menu
3. The system will:
   - Display current Security Council members
   - Verify your agent status
   - Show available actions based on your permissions

### 📝 Creating Proposals

Security Council members can create two types of proposals:

#### Standard Proposals
Regular governance proposals that go through the full governance process:

1. Select "Create New Proposal" from Security Council menu
2. Choose "Standard Proposal"
3. Provide proposal details:
   - **Title:** Clear, descriptive title
   - **Summary:** Brief explanation of the proposal
   - **Description:** Detailed rationale and implications
   - **Actions:** Smart contract calls to execute if approved

4. Review and confirm to submit

#### Emergency Proposals
Time-sensitive proposals with encrypted content for Security Council review:

1. Select "Create New Proposal" from Security Council menu
2. Choose "Emergency Proposal"
3. Provide proposal details (same as standard)
4. The system will:
   - Encrypt sensitive content for Security Council members
   - Store both public and encrypted metadata on IPFS
   - Create the proposal with appropriate urgency flags

**Important:** Emergency proposals require Security Council members to have registered encryption keys. See [Emergency Proposal Encryption](EMERGENCY_PROPOSAL_ENCRYPTION.md) for technical details.

### ✅ Proposal Approval Workflow

#### Viewing Pending Proposals

1. Select "Approve/Execute Proposals" from Security Council menu
2. Choose the type of proposals to review:
   - **Standard Proposals:** Pre-public stage proposals requiring approval
   - **Emergency Proposals:** Urgent proposals with encrypted content

#### Approving Proposals

1. Select a proposal from the list
2. Review all proposal details:
   - Metadata and description
   - Proposed actions and their implications
   - Current approval status
3. Choose your action:
   - **Approve:** Add your approval to the proposal
   - **Execute:** Trigger execution if sufficient approvals exist
   - **View Details:** Get more information without taking action

#### Execution Process

Proposals can be executed when they meet the required approval threshold:

1. Select "Execute" from the proposal actions menu
2. Review the final confirmation details
3. Confirm execution - this will:
   - Submit the execution transaction
   - Trigger all proposed actions on-chain
   - Move the proposal to completed status

### 🔐 Emergency Proposal Encryption

Security Council members can decrypt and view emergency proposals that contain sensitive information.

#### Setting Up Encryption (One-time)

1. **Register Public Key:**
   - The CLI will prompt you to sign a message
   - Your public key is derived and stored on-chain
   - This enables you to receive encrypted proposals

2. **Verify Registration:**
   - Check the "Security Council Members" table
   - Ensure your address shows encryption capability

#### Decrypting Proposals

When viewing emergency proposals:

1. Select the encrypted proposal from the list
2. The CLI will prompt you to sign a decryption message
3. Content is decrypted locally using your private key
4. View the full proposal details including:
   - Complete metadata and description
   - All proposed actions
   - Verification against on-chain hashes

For technical details on the encryption system, see [Emergency Proposal Encryption](EMERGENCY_PROPOSAL_ENCRYPTION.md).

### 📊 Viewing Proposals

#### Standard Proposals
View all proposals in the Security Council pipeline:

1. Select "View Standard Proposals"
2. Browse the list of pending proposals
3. Select any proposal to view:
   - Full proposal metadata
   - Proposed actions
   - Current approval status
   - Timeline information

#### Emergency Proposals
Access time-sensitive encrypted proposals:

1. Select "View Emergency Proposals"
2. The system shows available emergency proposals
3. Select a proposal to decrypt and view
4. Review sensitive information and proposed urgent actions

## Best Practices for Security Council Members

### Proposal Creation

1. **Be Clear and Comprehensive:**
   - Write detailed descriptions explaining the need and impact
   - Include rationale for why the action is necessary
   - Provide context for community understanding

2. **Use Appropriate Proposal Type:**
   - Standard proposals for regular governance actions
   - Emergency proposals only for urgent security or critical issues

3. **Test on Holesky First:**
   - Practice proposal creation on testnet
   - Verify IPFS pinning works correctly
   - Test the complete workflow before mainnet use

### Proposal Review and Approval

1. **Thorough Review:**
   - Read all proposal details carefully
   - Verify proposed actions match the description
   - Consider potential unintended consequences

2. **Timely Response:**
   - Review proposals promptly to avoid delays
   - Communicate with other Security Council members if needed
   - Execute approved proposals without unnecessary delay

3. **Coordinate with Team:**
   - Discuss complex proposals with other Security Council members
   - Ensure sufficient approvals before execution
   - Share knowledge about proposal implications

### Security Considerations

1. **Key Management:**
   - Keep your private keys secure and never share them
   - Use different keys for mainnet and testnet
   - Consider using hardware wallets for additional security

2. **Verification:**
   - Always verify proposal actions match descriptions
   - Check that IPFS content hasn't been tampered with
   - Validate emergency proposal hashes after decryption

3. **Transparency:**
   - Provide rationale for your approval decisions when possible
   - Communicate with the community about significant proposals
   - Document important decisions for future reference

## Troubleshooting

### Common Issues

**"NOT an appointed agent" Error**
- Verify your private key in `.env` is correct
- Ensure you're connected to the right network (mainnet/holesky)
- Confirm your address is actually a Security Council member

**IPFS Pinning Failures**
- Check your Pinata JWT token is correct
- Run `pnpm test:ipfs` to verify configuration
- Ensure you have sufficient Pinata quota (100 pins/month on free tier)

**Encryption Key Not Registered**
- Run through the public key registration process
- Sign the deterministic message to generate your keypair
- Verify your key appears in the Security Council member list

**Decryption Failures**
- Ensure your wallet address matches your registered encryption key
- Try re-signing the decryption message
- Verify the proposal was encrypted for your key

### Emergency Procedures

If you encounter critical issues:

1. **System Failures:** Report immediately to the development team
2. **Security Concerns:** Follow established Security Council emergency protocols
3. **Proposal Issues:** Coordinate with other Security Council members before taking action

## Advanced Features

### Direct Contract Interaction

Use the "Read Bare Contracts" feature for advanced inspection:

- Verify proposal states directly on-chain
- Check Security Council member status
- Inspect contract configurations and parameters
- Validate transaction results

### Network Management

- Test all procedures on Holesky before mainnet use
- Switch between networks to compare configurations
- Use testnet for training new Security Council members

## Development and Testing

### Local Development

```bash
# Build and run locally
pnpm build
pnpm dev

# Run tests
pnpm test
pnpm test:coverage

# Code quality
pnpm lint
pnpm format
```

### Testing Emergency Proposals on Holesky

1. Ensure you're a Security Council member on Holesky
2. Register your encryption public key
3. Create a test emergency proposal
4. Verify encryption, approval, and execution workflow
5. Test decryption with other Security Council members

This testing ensures the emergency proposal system works correctly when needed on mainnet.

## Support and Resources

- **Technical Issues:** Open issues on the GitHub repository
- **Security Concerns:** Follow established Security Council communication channels
- **Documentation:** Refer to [User Guide](USER_GUIDE.md) for general features
- **IPFS Setup:** See detailed [Pinata Setup Guide](PINATA_SETUP.md)

Remember: Security Council responsibilities require careful attention to detail and prompt action. Always verify your actions and coordinate with other members when needed.