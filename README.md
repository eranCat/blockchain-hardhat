# Elections 2025 - Decentralized Voting DApp

Blockchain voting system with Merkle tree registry, time-bounded voting, anonymous questionnaire matching, and ERC20 rewards.

## 🎯 Features

- **Admin Panel** - Add candidates, set voting periods, manage registry
- **Merkle Tree Voter Registry** - Gas-efficient, privacy-preserving eligibility verification
- **Time-Bounded Voting** - Configurable start/end times
- **Direct Voting** - Traditional candidate selection
- **Anonymous Questionnaire Voting** (★ 5 bonus points) - Euclidean distance algorithm matches voter positions to closest candidate
- **BAL Token Rewards** - ERC20 tokens minted to voters
- **Candidate NFTs** - NFT minting with 10% royalty tracking

## 📋 Requirements

- Node.js ≥ 22
- MetaMask wallet
- Sepolia testnet ETH ([get from faucet](https://sepoliafaucet.com))

## 🚀 Installation

```bash
npm install
cd frontend
npm install
cd ..
```

## ⚙️ Environment Setup

### Root `.env` File

Create `.env` in the project root:

```ini
# Network Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# Alternative: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_WITHOUT_0x
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Contract Addresses (fill after deployment)
VOTING_ADDR_SEPOLIA=
BAL_TOKEN_ADDR_SEPOLIA=
CANDIDATE_NFT_ADDR=

# Performance Optimization
DEPLOYMENT_BLOCK=

# Election Configuration
CANDIDATE_NAMES=Alice,Bob,Charlie
ELECTION_START_ISO=2025-10-01T09:00:00+03:00
ELECTION_END_ISO=2025-10-31T21:00:00+03:00

# Merkle Tree Configuration
PROOFS_PATH=./data/proofs/proofs.json
VOTER_MERKLE_ROOT=
VOTERS_FILE=./data/voters.json

# Testing
VOTER_ADDR=0xYOUR_TEST_ADDRESS
CANDIDATE_ID=0
```

### Frontend `.env.local` File

Create `frontend/.env.local`:

```ini
# Frontend Configuration
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
VITE_VOTING_CONTRACT_ADDRESS=
VITE_BAL_TOKEN_CONTRACT_ADDRESS=
VITE_CANDIDATE_NFT_CONTRACT_ADDRESS=

# Optional
VITE_WALLETCONNECT_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID
```

### Getting API Keys

**Alchemy** (Recommended):
- Sign up at [alchemy.com](https://www.alchemy.com)
- Create new app on Sepolia network
- Copy API key to `SEPOLIA_RPC_URL`
- Free tier: 300M compute units/month

**Infura** (Alternative):
- Sign up at [infura.io](https://infura.io)
- Create new project
- Select Sepolia endpoint
- Free tier: 100k requests/day

**Etherscan**:
- Sign up at [etherscan.io](https://etherscan.io)
- Generate API key in account settings
- Used for contract verification

**WalletConnect** (Optional):
- Visit [cloud.walletconnect.com](https://cloud.walletconnect.com)
- Create new project
- Copy Project ID

### Private Key Setup

⚠️ **Security Warning**: Never commit your private key or use mainnet keys in development.

To export from MetaMask:
1. Open MetaMask → Account menu → Account details
2. Click "Show private key"
3. Enter password and copy key
4. Add to `.env` with `0x` prefix

## 🎬 Quick Start

### 1. Compile & Deploy

```bash
npx hardhat compile
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia
```

Update `.env` with deployed addresses and save the `DEPLOYMENT_BLOCK` number.

### 2. Setup Election

```bash
# Add candidates with policy positions
npx hardhat run scripts/addCandidate.ts --network sepolia

# Set voting window
npx hardhat run scripts/startElection.ts --network sepolia

# Create data/voters.json with addresses: ["0xAddr1", "0xAddr2"]
npx hardhat run scripts/generateProofs.ts

# Copy Merkle root from data/proofs/root.txt to .env as VOTER_MERKLE_ROOT
npx hardhat run scripts/setRoot.ts --network sepolia

# Grant minting permission
npx hardhat run scripts/setMinter.ts --network sepolia
```

### 3. Launch Frontend

```bash
# Copy ABIs to frontend
cp artifacts/contracts/Voting.sol/Voting.json frontend/src/contracts/
cp artifacts/contracts/BALToken.sol/BALToken.json frontend/src/contracts/

# Start development server
cd frontend
npm run dev
```

Visit `http://localhost:5173`

### 4. Vote & Check Results

```bash
# Test voting from CLI
npx hardhat run scripts/voteFromProof.ts --network sepolia

# View candidates
npx hardhat run scripts/checkCandidates.ts --network sepolia

# Check voting status
npx hardhat run scripts/checkWindow.ts --network sepolia

# View results (after election ends)
npx hardhat run scripts/checkResults.ts --network sepolia

# Check BAL balance
npx hardhat run scripts/checkBALBalance.ts --network sepolia
```

## 🗂️ Project Structure

```
├── contracts/
│   ├── Voting.sol              # Main voting contract
│   ├── BALToken.sol            # ERC20 reward token
│   └── CandidateNFT.sol        # NFT with royalties
├── scripts/
│   ├── deploy.ts               # Deployment
│   ├── addCandidate.ts         # Add candidates
│   ├── startElection.ts        # Set voting period
│   ├── generateProofs.ts       # Create Merkle proofs
│   ├── setRoot.ts              # Set Merkle root
│   ├── setMinter.ts            # Grant minting permission
│   ├── voteFromProof.ts        # Test voting
│   ├── checkResults.ts         # View results
│   └── extractABI.js           # Extract ABI for frontend
├── test/
│   └── Voting.test.ts          # Contract tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectWallet.tsx
│   │   │   ├── ElectionStatus.tsx
│   │   │   ├── CandidateList.tsx
│   │   │   └── VotingInterface.tsx
│   │   ├── contracts/
│   │   │   ├── Voting.json
│   │   │   └── BALToken.json
│   │   ├── wagmi.config.ts
│   │   └── App.tsx
│   └── .env.local
├── ignition/modules/
│   └── VotingModule.ts
├── data/
│   ├── voters.json
│   └── proofs/
└── hardhat.config.ts
```

## 📊 Smart Contract Functions

**Admin Functions:**
- `addCandidate(name, positions)` - Add candidate with policy positions [economic, social, foreign] (0-10)
- `setMerkleRoot(root)` - Set voter registry
- `setVotingWindow(start, end)` - Set voting period

**Voter Functions:**
- `vote(candidateId, proof)` - Direct vote
- `voteByQuestionnaire(positions, proof)` - Anonymous vote based on policy matching
- `claimReward()` - Claim BAL tokens (usually automatic)

**View Functions:**
- `getResults()` - Ranked results (after voting ends)
- `getAllCandidates()` - Candidates with positions and votes
- `getVotingStatus()` - Check if election is active
- `hasVoted(address)` - Check if address voted

## 🧮 Questionnaire Algorithm

Euclidean distance matching:

```
distance = (v₁-c₁)² + (v₂-c₂)² + (v₃-c₃)²
```

Where vᵢ = voter position, cᵢ = candidate position. Candidate with minimum distance receives the vote anonymously.

**Example:**
- Voter: [7, 4, 5]
- Alice: [8, 3, 6] → distance = 3
- Bob: [2, 9, 4] → distance = 51
- Charlie: [5, 5, 8] → distance = 13

**Result:** Vote goes to Alice (closest match)

## 🗳️ How to Vote

### Using Frontend

1. **Connect Wallet** - MetaMask on Sepolia
2. **Upload Proof** - Upload your `proofs.json` file
3. **Vote** - Two methods:
   - **Direct**: Select candidate → Submit
   - **Questionnaire**: Answer 3 policy questions (0-10 scale)
     - Economic (0=Free Market, 10=Gov Control)
     - Social (0=Traditional, 10=Progressive)
     - Foreign (0=Isolationist, 10=Interventionist)
4. **Claim Rewards** - Automatic BAL token distribution

### Admin Operations

1. **Add Candidates** - Via script or admin panel
2. **Set Voting Period** - Configure start/end times (must be future)
3. **Manage Registry** - Generate and distribute Merkle proofs

Create `data/voters.json`:
```json
["0xAddr1", "0xAddr2", "0xAddr3"]
```

Then run:
```bash
npx hardhat run scripts/generateProofs.ts
```

Individual proof generation:
```bash
node scripts/generateProof.js 0xVoterAddress
```

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Generate coverage report
npx hardhat coverage

# Enable gas reporting
REPORT_GAS=true npx hardhat test
```

## 🛠️ Troubleshooting

### Common Errors

**"WindowNotSet" error**
- Solution: Run `startElection.ts`

**"InvalidProof" error**
- Solution: Run `generateProofs.ts` then `setRoot.ts`

**"Caller not minter" error**
- Solution: Run `setMinter.ts`

**"VotingNotStarted" / "VotingEnded"**
- Solution: Check voting window timing with `checkWindow.ts`

### RPC Rate Limits

If hitting Alchemy limits:
- Add `DEPLOYMENT_BLOCK` to `.env` to reduce event scanning
- Switch to Infura RPC
- Upgrade to paid tier for production

### MetaMask Issues

- Verify Sepolia network (Chain ID: 11155111)
- Reset account if transactions stuck
- Clear browser cache
- Check Sepolia ETH balance

### Contract Address Mismatch

- Update contract addresses in both `.env` files after deployment
- Copy latest ABIs from `artifacts/` to `frontend/src/contracts/`
- Verify RPC URL matches deployed network

## 🐛 Known Bugs

**Minor issues (no functionality impact):**
1. BAL rewards may require manual `setMinter` call after deployment
2. Merkle proofs require script generation (no GUI)
3. Single-voter Merkle trees need dummy address
4. Frontend timer may have 1-second initial delay

## 🎓 Course Requirements

**Core Features (90 points):**
- ✅ Admin interface via scripts
- ✅ Candidate management with policy positions
- ✅ Merkle tree voter registry
- ✅ Time-bounded voting
- ✅ Results with rankings
- ✅ ERC20 BAL token rewards
- ✅ MetaMask-compatible

**Bonus:**
- ✅ Anonymous questionnaire voting (5 points)
- ✅ Candidate NFTs with royalties

**Total:** 100 points (original project track)

## 🛡️ Tech Stack

- **Backend**: Hardhat 3.0.6, Solidity 0.8.28, OpenZeppelin 5.1.0
- **Frontend**: React 18, Wagmi 2.x, Viem 2.x, TanStack Query 5.x
- **Network**: Ethereum Sepolia testnet
- **Tools**: TypeScript, Ethers.js v6

## 🌐 Deployed Contracts (Sepolia)

- **Voting**: `0x45ea030d5ac29c85705155cb9da38d9f5d93f916`
- **BALToken**: `0x17730d189a81352c4bda4b86f56a5fa7c9e1c81d`
- **CandidateNFT**: `0xcd74450f85fd974e4309e7f2d1e18b97170315a0`

View on [Sepolia Etherscan](https://sepolia.etherscan.io)

## 📚 Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Etherscan Sepolia](https://sepolia.etherscan.io)

## 👤 Author

**Eran Karaso**  
Blockchain Development Course 2025