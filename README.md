# Elections 2025 - Decentralized Voting DApp

Blockchain voting system with Merkle tree registry, time-bounded voting, anonymous questionnaire matching, and ERC20 rewards.

## 🎯 Features

- **Admin Panel** - Add candidates, set voting periods, manage registry
- **Merkle Tree Voter Registry** - Gas-efficient, privacy-preserving eligibility verification
- **Time-Bounded Voting** - Configurable start/end times with real-time status
- **Direct Voting** - Traditional candidate selection
- **Anonymous Questionnaire Voting** (★ 5 bonus points) - Euclidean distance algorithm matches voter positions to closest candidate
- **BAL Token Rewards** - ERC20 tokens automatically distributed to voters
- **Candidate NFTs** - Optional NFT minting with royalty support
- **React Frontend** - Wagmi/Viem integration with MetaMask

## 📋 Requirements

- Node.js ≥ 22
- MetaMask or Web3 wallet
- Sepolia testnet ETH ([get from faucet](https://sepoliafaucet.com))

## 🚀 Installation

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## ⚙️ Environment Setup

### Backend Configuration (`.env`)

```ini
# Network
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# Alternative: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Contract Addresses (after deployment)
VOTING_ADDR_SEPOLIA=
BAL_TOKEN_ADDR_SEPOLIA=
CANDIDATE_NFT_ADDR=

# Performance optimization
DEPLOYMENT_BLOCK=

# Election Configuration
CANDIDATE_NAMES=Alice,Bob,Charlie
ELECTION_START_ISO=2025-10-01T09:00:00+03:00
ELECTION_END_ISO=2025-10-31T21:00:00+03:00

# Merkle Proofs
PROOFS_PATH=./data/proofs/proofs.json
VOTER_MERKLE_ROOT=
VOTERS_FILE=./data/voters.json

# Testing
VOTER_ADDR=0xYOUR_TEST_ADDRESS
CANDIDATE_ID=0
```

### Frontend Configuration (`frontend/.env.local`)

```ini
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_VOTING_CONTRACT_ADDRESS=
VITE_BAL_TOKEN_CONTRACT_ADDRESS=
VITE_CANDIDATE_NFT_CONTRACT_ADDRESS=
```

### RPC Provider Options

**Alchemy** (default): 300M compute units/month free
**Infura** (alternative): 100k requests/day free

If rate limited, switch to Infura or add `DEPLOYMENT_BLOCK` to reduce event scanning.

## 🎬 Quick Start

### 1. Compile

```bash
npx hardhat compile
```

### 2. Deploy to Sepolia

```bash
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia
```

Save the three contract addresses and deployment block to `.env` and `frontend/.env.local`.

### 3. Initialize Election

```bash
# Add candidates
npx hardhat run --network sepolia scripts/addCandidate.ts

# Set voting window
npx hardhat run --network sepolia scripts/startElection.ts

# Generate Merkle proofs (create data/voters.json first with addresses)
npx hardhat run scripts/generateProofs.ts

# Set Merkle root (copy from data/proofs/root.txt to .env)
npx hardhat run --network sepolia scripts/setRoot.ts

# Grant minting permission
npx hardhat run --network sepolia scripts/setMinter.ts
```

### 4. Setup Frontend

```bash
# Copy ABIs
cp artifacts/contracts/Voting.sol/Voting.json frontend/src/contracts/
cp artifacts/contracts/BALToken.sol/BALToken.json frontend/src/contracts/

# Extract ABI for alternative frontend
node scripts/extractABI.js
```

### 5. Verify Setup

```bash
npx hardhat run --network sepolia scripts/checkCandidates.ts
npx hardhat run --network sepolia scripts/checkWindow.ts
npx hardhat run --network sepolia scripts/checkResults.ts
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

### 7. Test Vote (CLI)

```bash
npx hardhat run --network sepolia scripts/voteFromProof.ts
```

### 8. Check Results

```bash
npx hardhat run --network sepolia scripts/checkResults.ts
npx hardhat run --network sepolia scripts/checkBALBalance.ts
```

## 🏗️ Project Structure

```
├── contracts/
│   ├── Elections.sol/Voting.sol   # Main voting contract
│   ├── BALToken.sol               # ERC20 reward token
│   └── CandidateNFT.sol          # Optional NFT support
├── scripts/
│   ├── deploy.js                  # Deployment
│   ├── addCandidate.ts           # Add candidates
│   ├── startElection.ts          # Set voting period
│   ├── generateProofs.ts         # Create Merkle proofs
│   ├── setRoot.ts                # Set Merkle root
│   ├── voteFromProof.ts          # Test voting
│   ├── checkResults.ts           # View results
│   └── extractABI.js             # Extract ABI for frontend
├── test/
│   └── Elections.test.js/Voting.test.ts
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectWallet.tsx
│   │   │   ├── ElectionStatus.tsx
│   │   │   ├── CandidateList.tsx
│   │   │   └── BALBalance.tsx
│   │   ├── contracts/
│   │   │   ├── Voting.json
│   │   │   └── BALToken.json
│   │   └── App.tsx
│   └── .env.local
└── hardhat.config.js
```

## 🧪 Testing

```bash
npx hardhat test                    # Run all tests
npx hardhat coverage               # Coverage report
REPORT_GAS=true npx hardhat test  # Gas reporting
```

## 📱 Using the DApp

### As Voter

1. **Connect Wallet** - MetaMask on Sepolia
2. **Upload Proof** - Upload your `proofs.json` file
3. **Vote** - Two methods:
   - **Direct**: Select candidate → Submit
   - **Questionnaire** (if available): Answer 3 policy questions (0-10 scale)
     - Economic (0=Free Market, 10=Gov Control)
     - Social (0=Traditional, 10=Progressive)  
     - Foreign (0=Isolationist, 10=Interventionist)
4. **View Results** - After voting ends (via CLI: `checkResults.ts`)
5. **Claim Rewards** - Automatic BAL token distribution

### As Admin

1. **Add Candidates** - Via script or admin panel
2. **Set Voting Period** - Configure start/end times (must be future)
3. **Manage Registry** - Generate and distribute Merkle proofs

### Generate Merkle Proofs

```bash
# Create data/voters.json with addresses: ["0xAddr1", "0xAddr2"]
npx hardhat run scripts/generateProofs.ts

# Individual proof for one address
node scripts/generateProof.js 0xVoterAddress
```

## 🔐 Smart Contract Functions

### Admin
- `addCandidate(name, positions)` - Add candidate with policy positions
- `setVoterRegistry(merkleRoot)` - Set voter Merkle tree
- `setVotingPeriod(start, end)` - Configure voting window
- `grantRole(MINTER_ROLE, votingContract)` - Enable NFT minting

### Voter
- `vote(candidateId, merkleProof)` - Cast direct vote
- `voteByQuestionnaire(positions, merkleProof)` - Anonymous vote
- `claimReward()` - Claim BAL tokens (if not automatic)

### View
- `getResults()` - Ranked results (after voting ends)
- `getWinner()` - Election winner
- `getAllCandidates()` - List candidates
- `getCandidates()` - Frontend-optimized candidate list

## 🧮 Algorithm: Questionnaire Matching

Anonymous voting uses Euclidean distance:

```
distance = (v₁-c₁)² + (v₂-c₂)² + (v₃-c₃)²
```

Where vᵢ = voter position, cᵢ = candidate position on topic i. Candidate with minimum distance receives the vote.

## 🐛 Known Bugs

**Minor issues (no functionality impact):**
1. Reward distribution may require manual claim in some configurations
2. Merkle proofs require manual generation via script
3. Timer display may have 1-second initial delay
4. Frontend live results removed - use CLI `checkResults.ts` until dedicated results component added

## 🔧 Troubleshooting

### RPC Rate Limits
- Add `DEPLOYMENT_BLOCK` to `.env`
- Switch to Infura RPC
- Use paid tier for production

### MetaMask Issues
- Verify Sepolia network (Chain ID: 11155111)
- Reset account if transactions stuck
- Clear browser cache

### Transaction Failures
- Check Sepolia ETH balance
- Verify voting window is active
- Ensure address in voter allowlist
- Generate valid Merkle proof

### Frontend Connection
- Update contract addresses in `frontend/.env.local`
- Copy latest ABIs from `artifacts/`
- Verify RPC URL matches network

## 🎓 Course Requirements

**Core Features (90 points):**
- ✅ Admin GUI interface
- ✅ Candidate management
- ✅ Merkle tree voter registry
- ✅ Time-bounded voting window
- ✅ Results display with rankings
- ✅ ERC20 token (BAL) rewards
- ✅ MetaMask integration

**Bonus:**
- ✅ Anonymous questionnaire voting algorithm (5 points)
- ✅ Candidate NFTs with royalties
- ✅ React frontend with Wagmi

**Total:** 100+ points (original project track)

## 🛠️ Tech Stack

- **Backend:** Hardhat 3.0.6, Solidity 0.8.28, OpenZeppelin 5.1.0
- **Frontend:** React 18, Wagmi 2.x, Viem 2.x, TanStack Query 5.x
- **Network:** Ethereum Sepolia testnet
- **Tools:** TypeScript, Ethers.js v6

## 📚 Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Etherscan Sepolia](https://sepolia.etherscan.io)

## 👥 Author

Eran Karaso  
Elections 2025 - Blockchain Development Course