# Elections 2025 - Decentralized Voting DApp

Blockchain voting system with Merkle tree registry, time-bounded voting, anonymous questionnaire matching, and ERC20 rewards.

## Features

- **Admin Panel** - Add candidates with policy positions, set voting windows, manage voter registry
- **Merkle Tree Registry** - Gas-efficient voter verification using OpenZeppelin StandardMerkleTree
- **Time-Bounded Voting** - Configurable start/end timestamps with validation
- **Direct Voting** - Traditional candidate selection by ID
- **Anonymous Questionnaire** (★5 bonus points) - Euclidean distance algorithm matches voter to closest candidate
- **BAL Token Rewards** - ERC20 tokens automatically minted to voters
- **Candidate NFTs** - ERC721 with 10% royalty (ERC2981) and ownership history
- **React Frontend** - Wagmi/Viem integration with MetaMask

## Prerequisites

- Node.js ≥ 22
- Foundry (for tests)
- MetaMask wallet
- Sepolia testnet ETH ([get faucet](https://sepoliafaucet.com))

## Installation

```bash
# Backend
npm install
npx hardhat compile

# Frontend
cd frontend
npm install
cd ..

# Install Foundry (Windows PowerShell as Admin)
irm get.scoop.sh -outfile 'install-scoop.ps1'
.\install-scoop.ps1
scoop install foundry
```

## Environment Setup

Create `.env`:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# After deployment
VOTING_ADDR_SEPOLIA=
BAL_TOKEN_ADDR_SEPOLIA=
CANDIDATE_NFT_ADDR=
DEPLOYMENT_BLOCK=

# Election config
CANDIDATE_NAMES=Alice,Bob,Charlie
ELECTION_START_ISO=2025-10-01T09:00:00+03:00
ELECTION_END_ISO=2025-10-31T21:00:00+03:00

# Merkle
VOTER_MERKLE_ROOT=
VOTERS_FILE=./data/voters.json
```

Create `frontend/.env.local`:
```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_VOTING_CONTRACT_ADDRESS=
VITE_BAL_TOKEN_CONTRACT_ADDRESS=
VITE_CANDIDATE_NFT_CONTRACT_ADDRESS=
```

## Testing

```bash
# Foundry tests (4 tests)
forge test

# Or via npm
npm test

# With gas report
forge test --gas-report
```

Expected output:
```
[PASS] test_DeploymentSuccess()
[PASS] test_AddCandidate()
[PASS] test_BatchSetCandidates()
[PASS] test_RevertInvalidPosition()
```

## Deployment

### Option 1: Hardhat Ignition (Recommended)
```bash
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia
```

### Option 2: Remix IDE
1. Upload `Voting.sol`, `BALToken.sol`, `CandidateNFT.sol` to [remix.ethereum.org](https://remix.ethereum.org)
2. Compile: Solidity 0.8.28, optimization 200
3. Deploy on Sepolia:
   - `BALToken("Ballot Token", "BAL", YOUR_ADDRESS)`
   - `CandidateNFT(YOUR_ADDRESS)`
   - `Voting(BAL_ADDRESS, "10000000000000000000", NFT_ADDRESS)`
4. Set permissions:
   - `BALToken.setMinter(VOTING_ADDRESS)`
   - `CandidateNFT.transferOwnership(VOTING_ADDRESS)`

Save addresses to `.env` and `frontend/.env.local`

## Configuration

### 1. Add Candidates
```bash
# Via script
npx hardhat run --network sepolia scripts/addCandidate.ts

# Or in Remix
setCandidate("Alice", [3, 7, 5])  # [economics, social, foreign] 0-10
setCandidate("Bob", [7, 3, 8])
setCandidate("Charlie", [5, 5, 3])
```

### 2. Set Voting Window
```bash
npx hardhat run --network sepolia scripts/startElection.ts
```

Or in Remix:
```solidity
// Get timestamp: Math.floor(Date.now() / 1000) in browser console
setVotingWindow(START_TIMESTAMP, END_TIMESTAMP)
```

### 3. Setup Voter Registry

Create `data/voters.json`:
```json
["0x669b237a521621a7Bc242a18B94f695f52340B9A", "0x70997970..."]
```

Generate proofs:
```bash
npx hardhat run scripts/generateProofs.ts
```

Set root:
```bash
# Copy from data/proofs/root.txt to .env
npx hardhat run --network sepolia scripts/setRoot.ts
```

### 4. Grant Minter Role
```bash
npx hardhat run --network sepolia scripts/setMinter.ts
```

## Usage

### Frontend
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

**Features:**
- Connect MetaMask
- Upload your `proofs.json` file
- Vote directly or via questionnaire
- View BAL token balance

### CLI Voting
```bash
# Vote with Merkle proof
npx hardhat run --network sepolia scripts/voteFromProof.ts

# Check results
npx hardhat run --network sepolia scripts/checkResults.ts

# Check BAL balance
npx hardhat run --network sepolia scripts/checkBALBalance.ts
```

### Admin Scripts
```bash
npx hardhat run --network sepolia scripts/checkCandidates.ts
npx hardhat run --network sepolia scripts/checkWindow.ts
```

## Questionnaire Voting Algorithm

Anonymous voting uses Euclidean distance to find closest match:

```
distance = √[(v₁-c₁)² + (v₂-c₂)² + (v₃-c₃)²]
```

Where vᵢ = voter position, cᵢ = candidate position on topic i (scale 0-10)

**Example:**
```
Voter: [7, 4, 5]

Alice:   [8, 3, 6] → distance = √3  ← Closest
Bob:     [2, 9, 4] → distance = √51
Charlie: [5, 5, 8] → distance = √13

Result: Vote goes to Alice (anonymous)
```

**Policy Topics:**
1. **Economics** - 0=Free Market, 10=Gov Control
2. **Social** - 0=Traditional, 10=Progressive  
3. **Foreign** - 0=Isolationist, 10=Interventionist

## Smart Contract API

### Admin (onlyOwner)
```solidity
setCandidate(string name, uint8[3] positions)
setCandidates(string[] names)  // Batch with [5,5,5] default
setVoterRoot(bytes32 root)
setVotingWindow(uint64 start, uint64 end)
```

### Voting
```solidity
vote(uint256 candidateId, bytes32[] merkleProof)
voteByQuestionnaire(uint8[3] positions, bytes32[] merkleProof)
```

### Views
```solidity
candidateCount() returns (uint256)
getCandidate(uint256 id) returns (string, uint8[3], uint256)
getResults() returns (string[], uint256[])  // Sorted by votes
getWinner() returns (string)
hasVoted(address) returns (bool)
getVotingWindow() returns (uint64, uint64)
```

## Project Structure

```
├── contracts/
│   ├── Voting.sol          # Main voting logic
│   ├── BALToken.sol        # ERC20 reward token
│   └── CandidateNFT.sol    # ERC721 with royalties
├── test/
│   └── voting.t.sol        # Foundry tests (4 passing)
├── scripts/
│   ├── addCandidate.ts     # Add candidates
│   ├── startElection.ts    # Set voting period
│   ├── generateProofs.ts   # Create Merkle proofs
│   ├── setRoot.ts          # Set Merkle root
│   ├── setMinter.ts        # Grant minting permission
│   ├── voteFromProof.ts    # CLI voting
│   ├── checkResults.ts     # View results
│   └── extractABI.js       # Export ABIs
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectWallet.tsx
│   │   │   ├── ElectionStatus.tsx
│   │   │   ├── CandidateList.tsx
│   │   │   └── BALBalance.tsx
│   │   ├── contracts/       # ABI files
│   │   └── App.tsx
│   └── .env.local
├── data/
│   ├── voters.json          # Voter addresses
│   └── proofs/
│       ├── proofs.json      # Generated proofs
│       └── root.txt         # Merkle root
└── ignition/modules/
    └── VotingModule.ts      # Deployment config
```

## Troubleshooting

### Dependency Conflicts
If `npm install` fails:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### RPC Rate Limits
- Add `DEPLOYMENT_BLOCK` to `.env`
- Switch to Infura: `https://sepolia.infura.io/v3/YOUR_KEY`
- Use paid tier for production

### Common Errors

| Error                | Solution                                        |
| -------------------- | ----------------------------------------------- |
| `AlreadyVoted`       | Each address votes once (by design)             |
| `InvalidMerkleProof` | Ensure root is set and address in `voters.json` |
| `VotingClosed`       | Check window with `getVotingWindow()`           |
| `InvalidCandidateId` | Use ID from 0 to `candidateCount()-1`           |
| Transaction stuck    | Reset MetaMask account                          |

### Frontend Issues
- Update contract addresses in `frontend/.env.local`
- Copy ABIs: `cp artifacts/contracts/*.sol/*.json frontend/src/contracts/`
- Clear browser cache and reconnect wallet

## Known Issues

Minor limitations (no functionality impact):

1. **Merkle Proofs** - Require script execution (standard practice)
2. **NFT Minting** - Fails gracefully if misconfigured (optional feature)
3. **Results Sorting** - O(n²) bubble sort (acceptable for <10 candidates)
4. **Frontend Timer** - 1-second initial delay on mount

## Course Requirements

**Core (90 points):**
- ✅ Admin interface (scripts + potential GUI)
- ✅ Candidate management with policy positions
- ✅ Merkle tree voter registry
- ✅ Time-bounded voting with validation
- ✅ Results display with winner calculation
- ✅ ERC20 BAL token rewards (automatic)
- ✅ MetaMask integration

**Bonus (15+ points):**
- ✅ Anonymous questionnaire voting (5 points) - Euclidean distance algorithm
- ✅ Candidate NFTs with royalties (5 points) - ERC721 + ERC2981
- ✅ React frontend with Wagmi (3 points)
- ✅ Advanced security (2 points) - ReentrancyGuard, custom errors

**Total: 105/100 points** (Original project track)

## Tech Stack

- **Backend**: Hardhat 2.22.0, Solidity 0.8.28, OpenZeppelin 5.4.0
- **Testing**: Foundry
- **Frontend**: React 18, Wagmi 2.x, Viem 2.x, TanStack Query
- **Network**: Ethereum Sepolia Testnet
- **Tools**: TypeScript, Node.js 22+

## Resources

- [Hardhat Docs](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Foundry Book](https://book.getfoundry.sh)
- [Wagmi Docs](https://wagmi.sh)
- [Viem Docs](https://viem.sh)
- [Remix IDE](https://remix.ethereum.org)
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Etherscan Sepolia](https://sepolia.etherscan.io)

## Deployed Contracts (Sepolia)

- **Voting**: [0x23770...A72](https://sepolia.etherscan.io/address/0x23770a5CDCefb121c37B83BAAaE96cCa5d475A72)
- **BALToken**: [0xF0a47...907](https://sepolia.etherscan.io/address/0xF0a47DA0785587415d563b90576b685ba9a79907)
- **CandidateNFT**: [0xd0532...702](https://sepolia.etherscan.io/address/0xd0532558E85b32e20481284B0DB65d375f727702)

---

**Author:** Eran Karaso  
**Course:** Blockchain Development 2025