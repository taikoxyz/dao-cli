# Taiko DAO CLI - User Guide

Welcome to the Taiko DAO CLI! This comprehensive guide will help you navigate the governance system, participate in proposals, and manage your voting power.

## Quick Start

### Installation & Setup

1. **Install the CLI:**
   ```bash
   git clone https://github.com/taikoxyz/dao-cli taiko-dao-cli
   cd taiko-dao-cli
   pnpm install
   pnpm build
   ```

2. **Launch the CLI:**
   ```bash
   pnpm start          # Interactive network selection
   pnpm start:mainnet  # Direct to mainnet
   pnpm start:holesky  # Direct to testnet
   ```

3. **Environment Setup (Optional):**
   For delegation and voting features, create a `.env` file:
   ```bash
   cp .env.example .env
   # Add your private key for signing transactions
   MAINNET_PRIVATE_KEY=your_mainnet_private_key
   HOLESKY_PRIVATE_KEY=your_holesky_private_key
   ```

## Main Features

### 🗳️ Public Stage Proposals

View and participate in active governance proposals that have reached the public voting stage.

**What you can do:**
- **View Proposals:** Browse all active public proposals with detailed information
- **Veto Proposals:** Cast veto votes on proposals you disagree with (requires wallet)

**How to use:**
1. Select "Public Stage Proposals" from the main menu
2. Choose "View Public Proposals" to see all active proposals
3. Select any proposal to view its full details including:
   - Title and description
   - Voting status and timeline
   - Proposed actions
   - Current vote counts

**Veto Voting:**
1. Select "Veto a Public Proposal"
2. Choose the proposal you want to veto
3. Confirm the transaction with your wallet

### 👥 Delegates

Manage delegate profiles and participate in the delegation system that amplifies governance participation.

#### View Delegates
Browse all registered delegates to understand who represents the community:

1. Select "Delegates" → "View Delegates List"
2. See total count of registered delegates
3. Select any delegate to view:
   - Profile information and content
   - Current voting power and token balance
   - Full metadata and details

#### Become a Delegate
Create your own delegate profile to represent other token holders:

1. Select "Delegates" → "Create/Update My Delegate Profile"
2. Provide the following information:
   - **Identifier:** Your display name (e.g., "TokenHolder123")
   - **Content URL:** Link to your detailed delegate platform/statement
   - **Metadata:** Additional JSON information about your background and positions

**Best Practices for Delegates:**
- Create a comprehensive delegate statement explaining your governance philosophy
- Include your background, expertise, and voting priorities
- Provide contact information for constituent feedback
- Regularly update your profile to reflect your governance activity

#### Delegate Your Voting Power
Amplify your governance participation by delegating to trusted representatives:

1. Select "Delegates" → "Delegate My Voting Power"
2. Choose from:
   - **Delegate to Address:** Enter a specific address to delegate to
   - **Choose from Registered:** Select from the list of registered delegates
3. Confirm the delegation transaction

**Understanding Delegation:**
- Delegation doesn't transfer your tokens - only your voting power
- You can change your delegation at any time
- Delegates cannot access or move your tokens
- You can still vote directly, which will override your delegate's vote for that proposal

### 🔍 Read Bare Contracts

Advanced feature for direct smart contract interaction and exploration.

**What you can do:**
- Browse all DAO contracts and their addresses
- Call any read-only (view) function on deployed contracts
- Inspect contract state and parameters
- Verify on-chain data

**How to use:**
1. Select "Read Bare Contracts" from the main menu
2. Choose a contract from the list (shows contract name and address)
3. Select a view function to call
4. Input any required parameters
5. View the results directly from the blockchain

**Common Use Cases:**
- Check your token balance: Call `balanceOf` on the token contract
- Verify proposal details: Call proposal-related functions
- Inspect voting power: Check delegation and voting weight functions
- Explore contract configuration: View settings and parameters

## Understanding Networks

### Mainnet
- **Purpose:** Live Taiko governance with real consequences
- **Tokens:** Real TAIKO tokens with economic value
- **Use for:** Actual governance participation, serious delegation decisions

### Holesky Testnet
- **Purpose:** Testing and learning the governance system
- **Tokens:** Test tokens with no economic value
- **Use for:** Experimenting with features, learning the interface, testing proposals

**Recommendation:** Start with Holesky to familiarize yourself with the system before participating on mainnet.

## Governance Participation Tips

### For Token Holders
1. **Stay Informed:** Regularly check public proposals to stay updated on governance decisions
2. **Consider Delegation:** If you can't actively participate, delegate to someone who aligns with your values
3. **Research Delegates:** Review delegate profiles and voting history before delegating
4. **Participate Actively:** Use veto power responsibly on proposals you genuinely disagree with

### For Delegates
1. **Be Transparent:** Clearly communicate your governance philosophy and voting rationale
2. **Stay Engaged:** Actively participate in governance discussions and vote on proposals
3. **Communicate:** Keep your delegators informed about your voting decisions
4. **Maintain Your Profile:** Keep your delegate information up-to-date and accessible

### For Community Members
1. **Learn the System:** Use the testnet to understand how governance works
2. **Read Proposals:** Take time to understand the implications of governance decisions
3. **Ask Questions:** Engage with delegates and the community for clarification
4. **Participate Constructively:** Contribute to governance discussions and provide feedback

## Troubleshooting

### Common Issues

**"Failed to connect ENV wallet" Warning**
- This is normal if you haven't set up a private key in `.env`
- You can still view proposals and delegates without a wallet
- Only delegation and voting require a configured wallet

**"Network connectivity issues"**
- Check your internet connection
- Try switching networks (mainnet ↔ holesky)
- Wait a moment and retry

**Can't see recent proposals**
- The system caches data for performance
- Data updates automatically when you switch networks
- Recent proposals may take a few minutes to appear

### Getting Help

- **Documentation:** Check this guide and the Security Council guide for advanced features
- **GitHub Issues:** Report bugs and request features at the repository
- **Community:** Engage with other users and delegates in Taiko governance forums

## Next Steps

1. **Explore:** Use the testnet to try all features without risk
2. **Learn:** Read about the proposals and understand the governance process
3. **Participate:** Start with delegation or proposal viewing on mainnet
4. **Contribute:** Consider becoming a delegate or creating proposals (if you're a Security Council member)

Remember: Governance is most effective when the community actively participates. Your voice and vote matter in shaping the future of Taiko!