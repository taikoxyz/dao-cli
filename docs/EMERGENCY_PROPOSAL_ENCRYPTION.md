# Emergency Proposal Encryption

## Overview

Emergency proposals in the Taiko DAO use end-to-end encryption to protect sensitive information while maintaining transparency and accountability. Only Security Council members can decrypt and view the full proposal details.

## How It Works

### 1. Encryption Process

When creating an emergency proposal:

1. **Symmetric Key Generation**: A random AES symmetric key is generated for the proposal
2. **Content Encryption**: The proposal metadata and actions are encrypted using the symmetric key
3. **Key Distribution**: The symmetric key is encrypted separately for each Security Council member using their registered public key
4. **IPFS Storage**: Both encrypted and public metadata are stored on IPFS
5. **On-chain Hashes**: Hashes of the public metadata and actions are stored on-chain for verification

### 2. Key Management

Security Council members must register their public keys in the `EncryptionRegistry` contract:

- Each member generates a deterministic keypair from their wallet signature
- The public key is stored on-chain in the registry
- The private key is derived deterministically when needed for decryption

### 3. Decryption Process

When a Security Council member wants to view an encrypted proposal:

1. They sign a deterministic message to derive their private key
2. The CLI attempts to decrypt the symmetric key using their private key
3. Once the symmetric key is recovered, the proposal content is decrypted
4. The decrypted actions are verified against the on-chain hash

## Technical Implementation

### Encryption Algorithm
- **Symmetric Encryption**: AES-256-GCM (via libsodium)
- **Asymmetric Encryption**: X25519-XSalsa20-Poly1305 (via libsodium)
- **Hashing**: Keccak256 for on-chain verification

### Data Structure

```typescript
interface EncryptedProposal {
  encrypted: {
    metadata: string;        // Base64 encoded encrypted metadata
    actions: string;         // Base64 encoded encrypted actions
    symmetricKeys: string[]; // Hex encoded encrypted symmetric keys
  }
}
```

### Contract Interface

```solidity
function createProposal(
    bytes _encryptedPayloadURI,      // IPFS URI of encrypted data
    bytes32 _publicMetadataUriHash,  // Hash of public metadata
    bytes32 _destinationActionsHash, // Hash of actions
    address _destinationPlugin,      // Target plugin for execution
    bool _approveProposal            // Auto-approve flag
)
```

## Security Considerations

1. **Public Key Registration**: Members must register their public keys before proposals can be encrypted for them
2. **Key Derivation**: Private keys are derived deterministically from wallet signatures
3. **No Key Storage**: Private keys are never stored, only derived when needed
4. **Verification**: Action hashes ensure integrity of encrypted content
5. **Transparency**: Public metadata provides transparency while protecting sensitive details

## Usage

### For Proposal Creators

1. Ensure Security Council members have registered public keys
2. Create an emergency proposal through the CLI
3. The proposal is automatically encrypted for all registered members
4. Both encrypted and public versions are stored on IPFS

### For Security Council Members

1. Register your public key (one-time setup):
   - The CLI will prompt you to sign a message
   - Your public key is derived and stored on-chain

2. View encrypted proposals:
   - The CLI will prompt you to sign to decrypt
   - Proposal details are decrypted locally
   - No sensitive data is exposed publicly

## Error Handling

- **No Public Keys**: If no Security Council members have registered public keys, emergency proposals cannot be created
- **Decryption Failure**: If a member cannot decrypt, they may not be in the recipient list or their key may not match
- **Hash Mismatch**: If decrypted content doesn't match on-chain hashes, the proposal may be corrupted

## Testing on Holesky

To test emergency proposal encryption on Holesky:

1. Ensure your account is a Security Council member
2. Register your public key in the EncryptionRegistry
3. Create an emergency proposal
4. Verify the encryption and decryption flow

The system will show which members have registered keys and warn about any missing registrations.