# Pinata IPFS Setup Guide

This guide will help you set up Pinata for pinning proposal metadata to IPFS.

## Step 1: Create a Pinata Account

1. Go to [pinata.cloud](https://pinata.cloud)
2. Click "Start Building" or "Sign Up"
3. Create a free account (no credit card required)

## Step 2: Generate a JWT Token

1. Once logged in, navigate to the **API Keys** section in your dashboard
2. Click **"New Key"**
3. Give your key a name (e.g., "Taiko DAO CLI")
4. Set the following permissions:
   - **pinFileToIPFS**: ✅ Enabled
   - **pinJSONToIPFS**: ✅ Enabled
   - **pinList**: ✅ Enabled (optional, for verification)
5. Click **"Create Key"**
6. **Important**: Copy the JWT token immediately - it won't be shown again!

## Step 3: Configure the CLI

1. Create your `.env` file if it doesn't exist:
   ```bash
   cp .env.example .env
   ```

2. Add your Pinata JWT to the `.env` file:
   ```
   PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Step 4: Test Your Configuration

Run the IPFS test command to verify everything is working:

```bash
pnpm build
pnpm test:ipfs
```

You should see:
```
🧪 Testing IPFS pinning configuration...

📌 Using Pinata for IPFS pinning (JWT authentication)
📌 Pinning to IPFS via Pinata...
✅ Successfully pinned to IPFS: bafkreixxxxx...
✅ IPFS configuration test successful! Hash: bafkreixxxxx...

✅ IPFS configuration is working correctly!
You can now create proposals that will be properly pinned to IPFS.
```

## Troubleshooting

### Invalid JWT Error
- Make sure you copied the entire JWT token
- Ensure there are no extra spaces or line breaks in your `.env` file
- The JWT should start with `eyJ...`

### Rate Limiting
Pinata's free tier includes:
- 100 pins per month
- 1GB of storage
- Sufficient for testing and moderate usage

For production use with high volume, consider upgrading to a paid plan.

### Testing Individual Pins
You can verify your pinned content at:
```
https://gateway.pinata.cloud/ipfs/YOUR_IPFS_HASH
```

## Security Notes

- **Never commit your `.env` file** to version control
- Keep your JWT token secure - it provides access to your Pinata account
- Rotate your JWT regularly for production use
- Consider using different JWTs for development and production environments