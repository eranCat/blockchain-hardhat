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
```

## ⚙️ Environment Setup

Create `.env`:

```ini
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

VOTING_ADDR_SEPOLIA=
BAL_TOKEN_ADDR_SEPOLIA=
CANDIDATE_NFT_ADDR=

ELECTION_START_ISO=2025-10-01T09:00:00+03:00
ELECTION_END_ISO=2025-10-31T21:00:00+03:00
```

## 🎬 Quick Start

### 1. Compile & Deploy

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

Update `.env` with deployed addresses.

### 2. Setup Election

```bash
# Add candidates with policy positions
npx hardhat run scripts/addCandidate.ts --network sepolia

# Set voting window
npx hardhat run scripts/startElection.ts --network sepolia

# Create voter list in data/voters.json: ["0xAddr1", "0xAddr2"]
npx hardhat run scripts/generateProofs.ts

# Set Merkle root
npx hardhat run scripts/setRoot.ts --network sepolia

# Grant minting permission
npx hardhat run scripts/grantMinter.ts --network sepolia
```

### 3. Vote

```bash
# Questionnaire-based anonymous voting
npx hardhat run scripts/voteByQuestionnaire.ts --network sepolia

# Check results
npx hardhat run scripts/checkResults.ts --network sepolia
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
│   ├── grantMinter.ts          # Grant minting permission
│   ├── voteByQuestionnaire.ts  # Anonymous voting
│   └── checkResults.ts         # View results
└── hardhat.config.ts
```

## 📊 Smart Contract Functions

**Admin:**
- `addCandidate(name, positions)` - Add candidate with policy positions [economic, social, foreign] (0-10)
- `setMerkleRoot(root)` - Set voter registry
- `setWindow(start, end)` - Set voting period

**Voter:**
- `vote(candidateId, proof)` - Direct vote
- `voteByQuestionnaire(positions, proof)` - Anonymous vote based on policy matching
- `claimReward()` - Claim BAL tokens

**View:**
- `getResults()` - Ranked results
- `getCandidateDetails()` - Candidates with positions and votes

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

## 🐛 Known Bugs

**Minor issues (no functionality impact):**
1. BAL rewards require manual `setMinter` call after deployment
2. Merkle proofs require script generation (no GUI)
3. Single-voter Merkle trees need dummy address

## 🔧 Troubleshooting

**"WindowNotSet" error:** Run `startElection.ts`
**"InvalidProof" error:** Run `generateProofs.ts` then `setRoot.ts`
**"Caller not minter" error:** Run `grantMinter.ts`

## 🎓 Course Requirements

**Core (90 points):**
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

## 🛠️ Tech Stack

- Hardhat 3.0.6, Solidity 0.8.28
- OpenZeppelin 5.1.0
- Viem 2.x
- Sepolia testnet

## 📍 Deployed Contracts (Sepolia)

- Voting: `0x45ea030d5ac29c85705155cb9da38d9f5d93f916`
- BALToken: `0x17730d189a81352c4bda4b86f56a5fa7c9e1c81d`
- CandidateNFT: `0xcd74450f85fd974e4309e7f2d1e18b97170315a0`

## 🤓 Author

Eran Karaso  
Blockchain Development Course 2025