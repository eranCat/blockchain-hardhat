# Blockchain Voting System

Decentralized voting with Merkle tree authentication, ERC-20 rewards, and NFT-backed candidates.

## Features

- **Merkle Authentication** - Whitelist-based voting
- **ERC-20 Rewards** - BAL tokens per vote
- **NFT Candidates** - ERC-721 with ownership history & 10% royalties
- **Session Management** - Multiple elections via `currentElectionId`
- **Time-Bounded** - Start/end timestamps
- **Policy Matching** - Vote by questionnaire

## Quick Start

```bash
# Install
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your values

# Compile & Test
npm run compile
npm test

# Deploy locally
npm run node              # Terminal 1
npm run deploy:local      # Terminal 2

# Deploy to Sepolia
npm run deploy:sepolia

# Run frontend
cd frontend && npm run dev
```

## Scripts

| Command                       | Description            |
| ----------------------------- | ---------------------- |
| `npm run compile`             | Compile contracts      |
| `npm test`                    | Run tests              |
| `npm run deploy:sepolia`      | Deploy to Sepolia      |
| `npm run deploy:local`        | Deploy locally         |
| `npm run node`                | Start Hardhat node     |
| `npm run generate-proofs`     | Generate Merkle proofs |
| `npm run check-state:sepolia` | Inspect contract state |

## Smart Contracts

### Voting.sol

**Constructor:**
```solidity
constructor(address balToken_, address candidateNft_, uint256 rewardPerVote_)
```

**Admin Functions:**
- `setCandidatesWithNFT(names, positions, uris, receivers)` - Add candidates & mint NFTs
- `startElection(startTs, endTs)` - Start election (increments `currentElectionId`, resets votes)
- `setVoterRoot(bytes32)` - Set Merkle root
- `setRewardPerVote(uint256)` - Update reward amount

**Voting Functions:**
- `vote(candidateId, merkleProof)` - Vote with proof
- `voteByQuestionnaire(voterPos[3], merkleProof)` - Vote by policy match

**View Functions:**
- `getAllCandidates()` - Get names, positions, votes
- `getCandidateMeta(id)` - Get candidate details
- `getWinnerWithNft()` - Get winner with NFT data
- `hasVoted(address)` - Check if voted
- `isActive()` - Check if election active
- `winnerId()` - Get winner ID

**Key Storage:**
- `currentElectionId` - Increments each election
- `voterRoot` - Merkle root
- `lastVotedElection[address]` - Tracks voting per election
- `startTime / endTime` - Election window

### BALToken.sol

ERC-20 with role-based minting.

**Constructor:**
```solidity
constructor(string name_, string symbol_, address admin_)
```

**Functions:**
- `mint(address, uint256)` - Requires `MINTER_ROLE`

### CandidateNFT.sol

ERC-721 with ownership tracking and royalties.

**Constructor:**
```solidity
constructor(address creator_)
```

**Features:**
- Ownership history per token
- 10% creator royalty (ERC-2981)
- Marketplace-only transfers
- Role-based minting

## Flow

### Deployment
```typescript
// 1. Deploy contracts
balToken = await BALToken.deploy(name, symbol, admin);
candidateNFT = await CandidateNFT.deploy(creator);
voting = await Voting.deploy(balToken, candidateNFT, rewardPerVote);

// 2. Grant roles
await balToken.grantRole(MINTER_ROLE, voting);
await candidateNFT.grantRole(MINTER_ROLE, voting);

// 3. Generate Merkle proofs
const { root, proofs } = generateMerkleTree(voterAddresses);

// 4. Setup election
await voting.setCandidatesWithNFT(names, positions, uris, receivers);
await voting.setVoterRoot(root);
await voting.startElection(startTime, endTime);
```

### Voting
```typescript
// 1. Upload proofs.json in UI
// 2. Connect wallet
// 3. Vote with proof
await voting.vote(candidateId, proof);
// 4. Receive BAL tokens as reward
```

### New Election
```typescript
// 1. Add new candidates (optional)
await voting.setCandidatesWithNFT(...);

// 2. Update voter root (optional)
await voting.setVoterRoot(newRoot);

// 3. Start election (required - increments electionId)
await voting.startElection(startTime, endTime);

// Previous voters can now vote again
```

## Merkle Proofs

### Leaf Hash
```solidity
leaf = keccak256(abi.encodePacked(address))
```

### Parent Hash
```solidity
parent = keccak256(sorted(leftChild, rightChild))
```

### Generate Proofs
```bash
# 1. Create data/voters.json with addresses
["0xAddr1", "0xAddr2", "0xAddr3"]

# 2. Generate
npm run generate-proofs

# 3. Output: data/proofs/proofs.json
{
  "root": "0x...",
  "proofs": {
    "0xAddr1": ["0xProof1", "0xProof2"],
    ...
  }
}
```

## Environment Setup

**Root `.env`:**
```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_KEY
VOTER_ADDRESSES=0xAddr1,0xAddr2,0xAddr3

# After deployment
VOTING_ADDR_SEPOLIA=0x...
BAL_TOKEN_ADDR_SEPOLIA=0x...
CANDIDATE_NFT_ADDR_SEPOLIA=0x...
VOTER_MERKLE_ROOT=0x...
```

**Frontend `frontend/.env.local`:**
```bash
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...
VITE_BAL_TOKEN_ADDRESS_SEPOLIA=0x...
VITE_CANDIDATE_NFT_ADDRESS_SEPOLIA=0x...
```

## Testing

```bash
npm test
```

**7 Tests:**
- Session reset (voting again)
- Double voting prevention
- Vote count reset
- Inactive election
- Invalid candidate ID
- Winner calculation
- BAL token rewards

## Project Structure

```
blockchain-hardhat/
├── contracts/
│   ├── Voting.sol          # Main voting contract
│   ├── BALToken.sol        # ERC-20 rewards
│   └── CandidateNFT.sol    # ERC-721 candidates
├── scripts/
│   ├── deployAndStartElection.ts  # Full deployment
│   ├── generateProofs.ts          # Merkle proofs
│   ├── checkState.ts              # Contract inspector
│   └── extractABI.ts              # Copy ABIs
├── test/
│   └── voting.test.ts      # Test suite
├── frontend/
│   └── src/
│       ├── components/
│       └── contracts/      # Auto-generated ABIs
├── data/
│   └── proofs/             # Generated proofs
├── hardhat.config.ts
└── package.json
```

## Troubleshooting

**Invalid proof error:**
- Check Merkle root matches on-chain: `npm run check-state:sepolia`
- Verify voter address in `VOTER_ADDRESSES`

**Already voted error:**
- Start new election: `await voting.startElection(start, end)`

**Frontend not connecting:**
- Update `frontend/.env.local` with contract addresses
- Restart dev server

**NotEligible error:**
- Ensure `voterRoot` is set (not zero)
- Provide valid Merkle proof

## Gas Estimates

| Operation           | Gas   |
| ------------------- | ----- |
| Deploy BALToken     | ~1.5M |
| Deploy CandidateNFT | ~3M   |
| Deploy Voting       | ~4M   |
| Add Candidate + NFT | ~200k |
| Vote                | ~150k |
| Total Deployment    | ~8-9M |

## Security

- ✅ OpenZeppelin contracts
- ✅ ReentrancyGuard
- ✅ AccessControl & Ownable
- ✅ Input validation
- ✅ Merkle proofs
- ✅ Custom errors (gas efficient)

## Resources

- [Hardhat Docs](https://hardhat.org/docs)
- [Solidity Docs](https://docs.soliditylang.org)
- [OpenZeppelin](https://docs.openzeppelin.com)
- [Sepolia Faucet](https://sepoliafaucet.com/)

# Blockchain Voting System

Decentralized voting with Merkle tree authentication, ERC-20 rewards, and NFT-backed candidates.

## Features

- **Merkle Authentication** - Whitelist-based voting
- **ERC-20 Rewards** - BAL tokens per vote
- **NFT Candidates** - ERC-721 with ownership history & 10% royalties
- **Session Management** - Multiple elections via `currentElectionId`
- **Time-Bounded** - Start/end timestamps
- **Policy Matching** - Vote by questionnaire

## Quick Start

```bash
# Install
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your values

# Compile & Test
npm run compile
npm test

# Deploy locally
npm run node              # Terminal 1
npm run deploy:local      # Terminal 2

# Deploy to Sepolia
npm run deploy:sepolia

# Run frontend
cd frontend && npm run dev
```

## Scripts

| Command                       | Description            |
| ----------------------------- | ---------------------- |
| `npm run compile`             | Compile contracts      |
| `npm test`                    | Run tests              |
| `npm run deploy:sepolia`      | Deploy to Sepolia      |
| `npm run deploy:local`        | Deploy locally         |
| `npm run node`                | Start Hardhat node     |
| `npm run generate-proofs`     | Generate Merkle proofs |
| `npm run check-state:sepolia` | Inspect contract state |

## Smart Contracts

### Voting.sol

**Constructor:**
```solidity
constructor(address balToken_, address candidateNft_, uint256 rewardPerVote_)
```

**Admin Functions:**
- `setCandidatesWithNFT(names, positions, uris, receivers)` - Add candidates & mint NFTs
- `startElection(startTs, endTs)` - Start election (increments `currentElectionId`, resets votes)
- `setVoterRoot(bytes32)` - Set Merkle root
- `setRewardPerVote(uint256)` - Update reward amount

**Voting Functions:**
- `vote(candidateId, merkleProof)` - Vote with proof
- `voteByQuestionnaire(voterPos[3], merkleProof)` - Vote by policy match

**View Functions:**
- `getAllCandidates()` - Get names, positions, votes
- `getCandidateMeta(id)` - Get candidate details
- `getWinnerWithNft()` - Get winner with NFT data
- `hasVoted(address)` - Check if voted
- `isActive()` - Check if election active
- `winnerId()` - Get winner ID

**Key Storage:**
- `currentElectionId` - Increments each election
- `voterRoot` - Merkle root
- `lastVotedElection[address]` - Tracks voting per election
- `startTime / endTime` - Election window

### BALToken.sol

ERC-20 with role-based minting.

**Constructor:**
```solidity
constructor(string name_, string symbol_, address admin_)
```

**Functions:**
- `mint(address, uint256)` - Requires `MINTER_ROLE`

### CandidateNFT.sol

ERC-721 with ownership tracking and royalties.

**Constructor:**
```solidity
constructor(address creator_)
```

**Features:**
- Ownership history per token
- 10% creator royalty (ERC-2981)
- Marketplace-only transfers
- Role-based minting

## Flow

### Deployment
```typescript
// 1. Deploy contracts
balToken = await BALToken.deploy(name, symbol, admin);
candidateNFT = await CandidateNFT.deploy(creator);
voting = await Voting.deploy(balToken, candidateNFT, rewardPerVote);

// 2. Grant roles
await balToken.grantRole(MINTER_ROLE, voting);
await candidateNFT.grantRole(MINTER_ROLE, voting);

// 3. Generate Merkle proofs
const { root, proofs } = generateMerkleTree(voterAddresses);

// 4. Setup election
await voting.setCandidatesWithNFT(names, positions, uris, receivers);
await voting.setVoterRoot(root);
await voting.startElection(startTime, endTime);
```

### Voting
```typescript
// 1. Upload proofs.json in UI
// 2. Connect wallet
// 3. Vote with proof
await voting.vote(candidateId, proof);
// 4. Receive BAL tokens as reward
```

### New Election
```typescript
// 1. Add new candidates (optional)
await voting.setCandidatesWithNFT(...);

// 2. Update voter root (optional)
await voting.setVoterRoot(newRoot);

// 3. Start election (required - increments electionId)
await voting.startElection(startTime, endTime);

// Previous voters can now vote again
```

## Merkle Proofs

### Leaf Hash
```solidity
leaf = keccak256(abi.encodePacked(address))
```

### Parent Hash
```solidity
parent = keccak256(sorted(leftChild, rightChild))
```

### Generate Proofs
```bash
# 1. Create data/voters.json with addresses
["0xAddr1", "0xAddr2", "0xAddr3"]

# 2. Generate
npm run generate-proofs

# 3. Output: data/proofs/proofs.json
{
  "root": "0x...",
  "proofs": {
    "0xAddr1": ["0xProof1", "0xProof2"],
    ...
  }
}
```

## Environment Setup

**Root `.env`:**
```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_KEY
VOTER_ADDRESSES=0xAddr1,0xAddr2,0xAddr3

# After deployment
VOTING_ADDR_SEPOLIA=0x...
BAL_TOKEN_ADDR_SEPOLIA=0x...
CANDIDATE_NFT_ADDR_SEPOLIA=0x...
VOTER_MERKLE_ROOT=0x...
```

**Frontend `frontend/.env.local`:**
```bash
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...
VITE_BAL_TOKEN_ADDRESS_SEPOLIA=0x...
VITE_CANDIDATE_NFT_ADDRESS_SEPOLIA=0x...
```

## Testing

```bash
npm test
```

**7 Tests:**
- Session reset (voting again)
- Double voting prevention
- Vote count reset
- Inactive election
- Invalid candidate ID
- Winner calculation
- BAL token rewards

## Project Structure

```
blockchain-hardhat/
├── contracts/
│   ├── Voting.sol          # Main voting contract
│   ├── BALToken.sol        # ERC-20 rewards
│   └── CandidateNFT.sol    # ERC-721 candidates
├── scripts/
│   ├── deployAndStartElection.ts  # Full deployment
│   ├── generateProofs.ts          # Merkle proofs
│   ├── checkState.ts              # Contract inspector
│   └── extractABI.ts              # Copy ABIs
├── test/
│   └── voting.test.ts      # Test suite
├── frontend/
│   └── src/
│       ├── components/
│       └── contracts/      # Auto-generated ABIs
├── data/
│   └── proofs/             # Generated proofs
├── hardhat.config.ts
└── package.json
```

## Troubleshooting

**Invalid proof error:**
- Check Merkle root matches on-chain: `npm run check-state:sepolia`
- Verify voter address in `VOTER_ADDRESSES`

**Already voted error:**
- Start new election: `await voting.startElection(start, end)`

**Frontend not connecting:**
- Update `frontend/.env.local` with contract addresses
- Restart dev server

**NotEligible error:**
- Ensure `voterRoot` is set (not zero)
- Provide valid Merkle proof

## Gas Estimates

| Operation           | Gas   |
| ------------------- | ----- |
| Deploy BALToken     | ~1.5M |
| Deploy CandidateNFT | ~3M   |
| Deploy Voting       | ~4M   |
| Add Candidate + NFT | ~200k |
| Vote                | ~150k |
| Total Deployment    | ~8-9M |

## Security

- ✅ OpenZeppelin contracts
- ✅ ReentrancyGuard
- ✅ AccessControl & Ownable
- ✅ Input validation
- ✅ Merkle proofs
- ✅ Custom errors (gas efficient)

## Resources

- [Hardhat Docs](https://hardhat.org/docs)
- [Solidity Docs](https://docs.soliditylang.org)
- [OpenZeppelin](https://docs.openzeppelin.com)
- [Sepolia Faucet](https://sepoliafaucet.com/)