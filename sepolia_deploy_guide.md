# 🚀 Sepolia Testnet Deployment Guide

## Prerequisites

### 1. Get Sepolia ETH
- Visit [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- Or [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- You'll need ~0.5 ETH for deployment

### 2. Get RPC URL
**Option A: Alchemy (Recommended)**
1. Go to [Alchemy](https://www.alchemy.com/)
2. Create free account
3. Create new app on Sepolia
4. Copy HTTP URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`

**Option B: Infura**
1. Go to [Infura](https://www.infura.io/)
2. Create free account
3. Create new project
4. Copy Sepolia endpoint: `https://sepolia.infura.io/v3/YOUR_KEY`

## Step 1: Configure Environment

Create/update `.env` in project root:

```bash
# Sepolia Network
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_FROM_METAMASK

# Get your private key from MetaMask:
# Settings → Security & Privacy → Show private key

# Contract Addresses (will be filled after deployment)
VOTING_ADDR_SEPOLIA=
BAL_TOKEN_ADDR_SEPOLIA=
CANDIDATE_NFT_ADDR=

# Merkle Root (will be filled after generating proofs)
VOTER_MERKLE_ROOT=

# Election Config
CANDIDATE_NAMES=Alice,Bob,Charlie
ELECTION_START_ISO=2025-10-10T09:00:00+03:00
ELECTION_END_ISO=2025-10-20T21:00:00+03:00
```

## Step 2: Deploy to Sepolia

```bash
# Compile contracts
npx hardhat compile

# Deploy
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia

# Save the output addresses to .env:
# VOTING_ADDR_SEPOLIA=0x...
# BAL_TOKEN_ADDR_SEPOLIA=0x...
# CANDIDATE_NFT_ADDR=0x...
```

Expected output:
```
Deploying with: 0xYourAddress
BAL Token: 0x...
NFT: 0x...
Voting: 0x...
✅ Deployment complete!
```

## Step 3: Setup Election

### Add Candidates
```bash
npx hardhat run scripts/addCandidates.ts --network sepolia
```

### Set Voting Period
```bash
npx hardhat run scripts/startElection.ts --network sepolia
```

### Generate Merkle Proofs
```bash
# First, create data/voters.json with eligible addresses
npx hardhat run scripts/generateProofs.ts

# Copy the Merkle root to .env as VOTER_MERKLE_ROOT
```

### Set Merkle Root
```bash
npx hardhat run scripts/setRoot.ts --network sepolia
```

### Grant Minting Permission
```bash
npx hardhat run scripts/setMinter.ts --network sepolia
```

## Step 4: Configure Frontend

Update `frontend/.env.local`:

```bash
# Sepolia Network
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Contract Addresses (from Step 2)
VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...
VITE_BAL_TOKEN_CONTRACT_ADDRESS_SEPOLIA=0x...
VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=0x...

# Default network
VITE_DEFAULT_NETWORK=sepolia
```

### Copy ABIs
```bash
cp artifacts/contracts/Voting.sol/Voting.json frontend/src/contracts/
cp artifacts/contracts/BALToken.sol/BALToken.json frontend/src/contracts/
```

## Step 5: Configure MetaMask

### Add Sepolia Network (if not already added)
1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Select "Sepolia" or add manually:
   - Network Name: Sepolia Testnet
   - RPC URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`
   - Chain ID: 11155111
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.etherscan.io

### Import Test Account
1. Create new account or import existing
2. Get Sepolia ETH from faucet
3. Make sure this address is in `data/voters.json`

## Step 6: Test Voting

### Via Scripts
```bash
# Test direct vote
npx hardhat run scripts/voteFromProof.ts --network sepolia

# Test questionnaire vote
npx hardhat run scripts/voteByQuestionnaire.ts --network sepolia

# Check results
npx hardhat run scripts/checkResults.ts --network sepolia
```

### Via Frontend
```bash
cd frontend
npm run dev
```

1. Visit http://localhost:5173
2. Connect MetaMask
3. Switch to Sepolia network
4. Upload your proof file from `data/proofs/proofs.json`
5. Vote!

## Step 7: Verify Contracts (Optional)

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

Example:
```bash
npx hardhat verify --network sepolia 0xYourVotingAddress 0xBALTokenAddress
```

## Troubleshooting

### "Insufficient funds"
- Get more Sepolia ETH from faucets
- Check balance: `npx hardhat run scripts/checkBalance.ts --network sepolia`

### "Invalid nonce"
- Reset MetaMask account: Settings → Advanced → Reset Account

### "Transaction underpriced"
- Wait and retry, or increase gas price in hardhat.config.ts

### "Execution reverted"
Common causes:
- Voting period not started/ended
- Address not in voter registry
- Invalid Merkle proof
- Already voted

### Frontend not loading
1. Check contract addresses in `.env.local`
2. Verify ABIs are copied
3. Check RPC URL is valid
4. Open browser console for errors

## View on Etherscan

Check your deployed contracts:
```
https://sepolia.etherscan.io/address/<CONTRACT_ADDRESS>
```

Check transactions:
```
https://sepolia.etherscan.io/tx/<TX_HASH>
```

## Cost Estimation

Approximate gas costs on Sepolia:
- Deploy all contracts: ~0.01-0.02 ETH
- Add 3 candidates: ~0.001 ETH
- Set voting period: ~0.0005 ETH
- Vote (direct): ~0.002 ETH
- Vote (questionnaire): ~0.003 ETH

Total for full deployment + 10 votes: ~0.05 ETH

---

**Need Help?**
- Check error messages carefully
- Use Sepolia Etherscan to debug transactions
- Verify all addresses are correct
- Make sure you're on the right network
