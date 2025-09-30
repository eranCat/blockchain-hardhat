# Voting DApp - 2025 Elections

A blockchain-based voting system with Merkle proof allowlist, ERC20 token rewards, and on-chain vote counting.

## Features

- Merkle tree-based voter allowlist (privacy-preserving eligibility)
- Time-windowed voting periods
- BAL token rewards for voters (ERC20)
- On-chain vote tallying
- Admin controls for election setup
- Candidate NFTs (optional, with royalty support)

---

## Prerequisites

- Node.js ≥ 18
- npm (or pnpm/yarn)
- MetaMask or similar Web3 wallet
- Sepolia testnet ETH (get from [Sepolia faucet](https://sepoliafaucet.com))

---

## Installation

```bash
git clone <your-repo-url>
cd <project-directory>
npm install
````

-----

## Environment Setup

Create a `.env` file in the project root (never commit this file):

```ini
# Network Configuration
SEPOLIA_RPC_URL=[https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY](https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY)
SEPOLIA_PRIVATE_KEY=your_private_key_here

# Contract Addresses (populated after deployment)
VOTING_ADDR_SEPOLIA=0x...
BAL_TOKEN_ADDR_SEPOLIA=0x...
CANDIDATE_NFT_ADDR=0x...

# Election Configuration
CANDIDATE_NAMES=Alice,Bob,Charlie
ELECTION_START_ISO=2025-10-01T09:00:00+03:00
ELECTION_END_ISO=2025-10-31T21:00:00+03:00

# Merkle Proof Configuration
PROOFS_PATH=./data/proofs/proofs.json
VOTER_MERKLE_ROOT=0x...
VOTERS_FILE=./data/voters.json

# Voting Test Data
VOTER_ADDR=0x669b237a521621a7bc242a18b94f695f52340b9a
CANDIDATE_ID=0

# Optional
ETHERSCAN_API_KEY=your_etherscan_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
```

### Environment Variables Reference

| Variable                 | Purpose                         | Example                                    | Required For              |
| :----------------------- | :------------------------------ | :----------------------------------------- | :------------------------ |
| `SEPOLIA_RPC_URL`        | Sepolia network endpoint        | `https://eth-sepolia.g.alchemy.com/v2/...` | All network operations    |
| `SEPOLIA_PRIVATE_KEY`    | Deployer/admin wallet key       | `0xabc123...`                              | Deployment, admin scripts |
| `VOTING_ADDR_SEPOLIA`    | Deployed Voting contract        | `0x7178E35E...`                            | All voting operations     |
| `BAL_TOKEN_ADDR_SEPOLIA` | Deployed BALToken contract      | `0x17C73CE8...`                            | Token operations          |
| `CANDIDATE_NFT_ADDR`     | Deployed CandidateNFT contract  | `0xa6dA0747...`                            | NFT operations            |
| `CANDIDATE_NAMES`        | Comma-separated candidate list  | `Alice,Bob,Charlie`                        | `addCandidate.ts`         |
| `ELECTION_START_ISO`     | Voting start time               | `2025-10-01T09:00:00+03:00`                | `startElection.ts`        |
| `ELECTION_END_ISO`       | Voting end time                 | `2025-10-31T21:00:00+03:00`                | `startElection.ts`        |
| `VOTER_MERKLE_ROOT`      | Merkle root of voter allowlist  | `0x07b8dcf9...`                            | `setRoot.ts`              |
| `VOTER_ADDR`             | Test voter address              | `0x669b237a...`                            | `voteFromProof.ts`        |
| `CANDIDATE_ID`           | Candidate to vote for (0-based) | `0` (Alice), `1` (Bob), `2` (Charlie)      | `voteFromProof.ts`        |
| `PROOFS_PATH`            | Path to generated proofs        | `./data/proofs/proofs.json`                | `voteFromProof.ts`        |

-----

## Quick Start Guide

### 1\. Compile Contracts

```bash
npx hardhat compile
```

### 2\. Deploy to Sepolia

```bash
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia
```

Save the three contract addresses that are output:

  - `BALToken`: Update `BAL_TOKEN_ADDR_SEPOLIA` in `.env`
  - `CandidateNFT`: Update `CANDIDATE_NFT_ADDR` in `.env`
  - `Voting`: Update `VOTING_ADDR_SEPOLIA` in `.env`

### 3\. Initialize the Election

Run these scripts in order:

```bash
# Step 1: Set candidates
npx hardhat run --network sepolia scripts/addCandidate.ts

# Step 2: Set voting time window
npx hardhat run --network sepolia scripts/startElection.ts

# Step 3: Generate Merkle proofs for eligible voters
# First, create data/voters.json with voter addresses:
# ["0xYourAddress1", "0xYourAddress2", ...]
npx hardhat run scripts/generateProofs.ts

# Step 4: Copy the root from data/proofs/root.txt to .env as VOTER_MERKLE_ROOT
# Then set the Merkle root on-chain:
npx hardhat run --network sepolia scripts/setRoot.ts

# Step 5: Grant minting permission to Voting contract
npx hardhat run --network sepolia scripts/setMinter.ts
```

### 4\. Verify Setup

```bash
# Check candidates
npx hardhat run --network sepolia scripts/checkCandidates.ts

# Check voting window
npx hardhat run --network sepolia scripts/checkWindow.ts

# View results (should show 0 votes initially)
npx hardhat run --network sepolia scripts/checkResults.ts
```

### 5\. Cast a Test Vote

Make sure your `VOTER_ADDR` is in the `data/voters.json` file used to generate proofs.

```bash
# Set CANDIDATE_ID in .env (0=Alice, 1=Bob, 2=Charlie)
npx hardhat run --network sepolia scripts/voteFromProof.ts
```

### 6\. Check Results

```bash
# View vote tallies
npx hardhat run --network sepolia scripts/checkResults.ts

# Check BAL token balance (reward)
npx hardhat run --network sepolia scripts/checkBALBalance.ts
```

-----

## Frontend Setup & Usage (React DApp)

The client-side interface is located in the **`frontend/`** directory.

### 1\. Installation

Navigate into the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

### 2\. Environment Setup (`.env.local` file)

The frontend uses environment variables prefixed with `VITE_`. These must be set in a file named **`.env.local`** inside the `frontend/` directory, using the addresses deployed in Step 2 of the Quick Start Guide.

```ini
# frontend/.env.local (DO NOT COMMIT)

# RPC and Network
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Contract Addresses (Copied from the backend's .env file)
VITE_VOTING_CONTRACT_ADDRESS=0x...
VITE_BAL_TOKEN_CONTRACT_ADDRESS=0x...
VITE_CANDIDATE_NFT_CONTRACT_ADDRESS=0x...
```

### 3\. Running the DApp

Run the development server:

```bash
# Ensure you are still in the 'frontend/' directory
npm run dev
```

The application will start, typically on `http://localhost:5173/`, displaying the election status and allowing voters to connect their wallets and cast votes.

-----

## Script Reference

### Admin Scripts

| Script             | Purpose                                          | Required Env Vars                                               |
| :----------------- | :----------------------------------------------- | :-------------------------------------------------------------- |
| `addCandidate.ts`  | Set/update candidate list                        | `CANDIDATE_NAMES`, `VOTING_ADDR_SEPOLIA`                        |
| `startElection.ts` | Set voting time window                           | `ELECTION_START_ISO`, `ELECTION_END_ISO`, `VOTING_ADDR_SEPOLIA` |
| `setRoot.ts`       | Set Merkle root for voter allowlist              | `VOTER_MERKLE_ROOT`, `VOTING_ADDR_SEPOLIA`                      |
| `setMinter.ts`     | Grant BALToken minting rights to Voting contract | `BAL_TOKEN_ADDR_SEPOLIA`, `VOTING_ADDR_SEPOLIA`                 |

### Verification Scripts

| Script               | Purpose                 | Required Env Vars                      |
| :------------------- | :---------------------- | :------------------------------------- |
| `checkCandidates.ts` | View current candidates | `VOTING_ADDR_SEPOLIA`                  |
| `checkWindow.ts`     | View voting time window | `VOTING_ADDR_SEPOLIA`                  |
| `checkResults.ts`    | View vote tallies       | `VOTING_ADDR_SEPOLIA`                  |
| `checkBALBalance.ts` | Check BAL token balance | `BAL_TOKEN_ADDR_SEPOLIA`, `VOTER_ADDR` |

### Voter Scripts

| Script              | Purpose                                | Required Env Vars                                                  |
| :------------------ | :------------------------------------- | :----------------------------------------------------------------- |
| `generateProofs.ts` | Generate Merkle proofs from voter list | `VOTERS_FILE` or `--voters` flag                                   |
| `voteFromProof.ts`  | Submit a vote with Merkle proof        | `VOTER_ADDR`, `CANDIDATE_ID`, `PROOFS_PATH`, `VOTING_ADDR_SEPOLIA` |

-----

## Adding Voters to Allowlist

### Method 1: Manual List (Recommended for Testing)

Create `data/voters.json`:

```json
[
  "0x669b237a521621a7bc242a18b94f695f52340b9a",
  "0xAnotherAddress",
  "0xYetAnotherAddress"
]
```

Then generate proofs:

```bash
npx hardhat run scripts/generateProofs.ts
```

### Method 2: NFT Holders (Requires Alchemy API Key)

To use NFT holders as the voter allowlist:

```bash
npx hardhat run scripts/generateProofs.ts --nft-contract 0xYourNFTAddress
```

This fetches all current owners of the NFT contract and generates proofs for them.

-----

## Deployment Checklist

  - [ ] Contracts compiled successfully
  - [ ] Deployed to Sepolia (3 contract addresses saved)
  - [ ] Environment variables updated in `.env`
  - [ ] Candidates set via `addCandidate.ts`
  - [ ] Voting window set via `startElection.ts`
  - [ ] Voter list created in `data/voters.json`
  - [ ] Merkle proofs generated
  - [ ] Merkle root set on-chain via `setRoot.ts`
  - [ ] Minter permission granted via `setMinter.ts`
  - [ ] Test vote successful
  - [ ] Results display correctly

-----
## Troubleshooting

### "AlreadyVoted()" Error

Each address can only vote once. Use a different wallet address or redeploy the contract for testing.

### "InvalidProof()" Error

  - Ensure your address is in `data/voters.json`
  - Regenerate proofs after modifying the voter list
  - Update the Merkle root on-chain with `setRoot.ts`

### "VotingClosed()" Error

Check the voting window with `checkWindow.ts`. Ensure current time is between start and end times.

### "Missing env: VOTING\_ADDR" Error

Make sure you're using `VOTING_ADDR_SEPOLIA` for Sepolia network operations.

### Contract Functions Not Found

After updating contracts, ensure you:

1.  Recompile: `npx hardhat compile`
2.  Redeploy to get a new contract instance (old deployments won't have new functions)

-----

## Development Workflow

```bash
# Clean build artifacts
npm run clean

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to local network
npx hardhat ignition deploy ignition/modules/VotingModule.ts

# Deploy to Sepolia
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia
```

## Project Structure

```
├── contracts/
│   ├── Voting.sol              # Main voting contract
│   ├── BALToken.sol           # ERC20 reward token
│   └── CandidateNFT.sol       # NFT for candidates
├── ignition/
│   └── modules/
│       └── VotingModule.ts    # Deployment module
├── scripts/
│   ├── addCandidate.ts        # Set candidates
│   ├── startElection.ts       # Set voting window
│   ├── setRoot.ts             # Set Merkle root
│   ├── setMinter.ts           # Grant minting permission
│   ├── generateProofs.ts      # Generate Merkle proofs
│   ├── voteFromProof.ts       # Cast a vote
│   ├── checkCandidates.ts     # View candidates
│   ├── checkWindow.ts         # View voting window
│   ├── checkResults.ts        # View vote tallies
│   ├── checkBALBalance.ts     # Check token balance
│   ├── utils.ts               # Shared utilities
│   ├── abi-introspect.ts
│   ├── check-viem.ts
│   ├── checkProofs.ts
│   ├── checkStatus.ts
│   ├── debugVoting.ts
│   ├── fetchVotersFromNFT.ts
│   ├── getResults.ts
│   ├── mintCandidateNft.ts
│   ├── print-deployer.js
│   ├── send-op-tx.ts
│   └── vote.ts
├── data/
│   ├── voters.json            # List of eligible voters
│   └── proofs/
│       ├── proofs.json        # Generated Merkle proofs
│       └── root.txt           # Merkle root hash
├── test/                       # Contract tests
├── .env                        # Environment variables (DO NOT COMMIT)
├── hardhat.config.ts          # Hardhat configuration
└── README.md                  # This file
```

## Security Notes

  - Never commit `.env` file (contains private keys)
  - Never share your private key
  - Use testnet for development
  - Audit contracts before mainnet deployment
  - Keep Merkle proofs secure (they prove voting eligibility)

## Next Steps

1.  Build a frontend UI (React + Web3.js or Viem)
2.  Add result visualization
3.  Implement admin dashboard
4.  Add event logging and notifications
5.  Deploy to mainnet (after thorough testing)

## Resources

  - [Hardhat Documentation](https://hardhat.org/docs)
  - [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
  - [Viem Documentation](https://viem.sh)
  - [Merkle Trees Explained](https://en.wikipedia.org/wiki/Merkle_tree)
  - [Sepolia Faucet](https://sepoliafaucet.com)
