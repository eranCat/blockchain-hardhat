# Voting DApp - 2025 Elections

A blockchain-based voting system with Merkle proof allowlist, ERC20 token rewards, and on-chain vote counting.

## Features

- Merkle tree-based voter allowlist (privacy-preserving eligibility)
- Time-windowed voting periods
- BAL token rewards for voters (ERC20)
- On-chain vote tallying
- Admin controls for election setup
- Candidate NFTs (optional, with royalty support)
- React frontend with Wagmi integration

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

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

---

## Environment Setup

### Backend Configuration

Create a `.env` file in the project root (never commit this file):

```ini
# Network Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/abcd1234efgh5678ijkl9012mnop3456
SEPOLIA_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract Addresses (populated after deployment)
VOTING_ADDR_SEPOLIA=0x7178E35E5700b834eD44C555575de658559b93B9
BAL_TOKEN_ADDR_SEPOLIA=0x17C73CE8C0A53DFA2716063ad3C9480d2D53A84C
CANDIDATE_NFT_ADDR=0xa6dA07477e26003B6C4A22817bcEF7F6baBA3298

# Election Configuration
CANDIDATE_NAMES=Alice,Bob,Charlie
ELECTION_START_ISO=2025-10-01T09:00:00+03:00
ELECTION_END_ISO=2025-10-31T21:00:00+03:00

# Merkle Proof Configuration
PROOFS_PATH=./data/proofs/proofs.json
VOTER_MERKLE_ROOT=0x07b8dcf94c0583ba667464444fb22a6e504684c9b63ba2c91e76a3e73dfe9197
VOTERS_FILE=./data/voters.json

# Voting Test Data
VOTER_ADDR=0x669b237a521621a7bc242a18b94f695f52340b9a
CANDIDATE_ID=0

# Optional
ETHERSCAN_API_KEY=ABC123DEF456GHI789JKL012MNO345PQR678
ALCHEMY_API_KEY=abcd1234-efgh-5678-ijkl-9012mnop3456
```

### Frontend Configuration

Create a `frontend/.env.local` file (never commit this file):

```ini
# RPC and Network
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/abcd1234efgh5678ijkl9012mnop3456

# Contract Addresses (copy from backend .env after deployment)
VITE_VOTING_CONTRACT_ADDRESS=0x7178E35E5700b834eD44C555575de658559b93B9
VITE_BAL_TOKEN_CONTRACT_ADDRESS=0x17C73CE8C0A53DFA2716063ad3C9480d2D53A84C
VITE_CANDIDATE_NFT_CONTRACT_ADDRESS=0xa6dA07477e26003B6C4A22817bcEF7F6baBA3298
```

### Environment Variables Reference

| Variable                 | Purpose                         | Example                                    | Required For              |
| :----------------------- | :------------------------------ | :----------------------------------------- | :------------------------ |
| `SEPOLIA_RPC_URL`        | Sepolia network endpoint        | `https://eth-sepolia.g.alchemy.com/v2/...` | All network operations    |
| `SEPOLIA_PRIVATE_KEY`    | Deployer/admin wallet key       | `0xac0974bec39a17e36ba4a...`               | Deployment, admin scripts |
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

---

## Quick Start Guide

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Deploy to Sepolia

```bash
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia
```

Save the three contract addresses and update both `.env` and `frontend/.env.local`:

- `BALToken`: Update `BAL_TOKEN_ADDR_SEPOLIA` and `VITE_BAL_TOKEN_CONTRACT_ADDRESS`
- `CandidateNFT`: Update `CANDIDATE_NFT_ADDR` and `VITE_CANDIDATE_NFT_CONTRACT_ADDRESS`
- `Voting`: Update `VOTING_ADDR_SEPOLIA` and `VITE_VOTING_CONTRACT_ADDRESS`

### 3. Initialize the Election

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

### 4. Setup Frontend Contract ABIs

Copy the contract ABIs to the frontend:

```bash
# From project root
cp artifacts/contracts/Voting.sol/Voting.json frontend/src/contracts/
cp artifacts/contracts/BALToken.sol/BALToken.json frontend/src/contracts/
```

### 5. Verify Setup

```bash
# Check candidates
npx hardhat run --network sepolia scripts/checkCandidates.ts

# Check voting window
npx hardhat run --network sepolia scripts/checkWindow.ts

# View results (should show 0 votes initially)
npx hardhat run --network sepolia scripts/checkResults.ts
```

### 6. Start the Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` to use the DApp!

### 7. Cast a Test Vote (Optional - CLI)

Make sure your `VOTER_ADDR` is in the `data/voters.json` file used to generate proofs.

```bash
# Set CANDIDATE_ID in .env (0=Alice, 1=Bob, 2=Charlie)
npx hardhat run --network sepolia scripts/voteFromProof.ts
```

### 8. Check Results

```bash
# View vote tallies
npx hardhat run --network sepolia scripts/checkResults.ts

# Check BAL token balance (reward)
npx hardhat run --network sepolia scripts/checkBALBalance.ts
```

---

## Frontend Setup & Usage

### Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ConnectWallet.tsx      # Wallet connection
│   │   ├── ElectionStatus.tsx     # Voting window status
│   │   ├── CandidateList.tsx      # Voting interface
│   │   └── BALBalance.tsx         # Token balance display
│   ├── contracts/
│   │   ├── index.ts               # ABI exports
│   │   ├── Voting.json            # Voting contract ABI
│   │   └── BALToken.json          # BAL token ABI
│   ├── App.tsx                     # Main app component
│   ├── main.tsx                    # Entry point with Wagmi config
│   └── index.css                   # Styles
├── .env.local                      # Environment variables (DO NOT COMMIT)
└── package.json
```

### Required Frontend Dependencies

The frontend uses the following key dependencies:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "wagmi": "^2.x",
    "viem": "^2.x",
    "@tanstack/react-query": "^5.x"
  }
}
```

### Wagmi Configuration (`main.tsx`)

```typescript
import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
```

### Contract ABI Setup (`contracts/index.ts`)

```typescript
import VotingABI from './Voting.json';
import BALTokenABI from './BALToken.json';

export const votingABI = VotingABI.abi;
export const balTokenABI = BALTokenABI.abi;
```

### Frontend Components Overview

#### 1. ConnectWallet Component
- Connects/disconnects MetaMask wallet
- Displays connected address
- Shows connection status

#### 2. ElectionStatus Component
- Displays voting window (start/end times)
- Shows election status (pending/active/ended)
- Real-time status updates

#### 3. CandidateList Component
- Lists all candidates with vote counts
- Allows proof file upload
- Enables voting with Merkle proof verification
- Shows voting progress bars
- Displays transaction status

#### 4. BALBalance Component
- Shows user's BAL token balance
- Updates after successful votes
- Displays earned rewards

### User Workflow

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve MetaMask connection
   - Ensure you're on Sepolia testnet

2. **View Election Status**
   - See voting window (pending/active/ended)
   - Check start and end times
   - View your BAL token balance

3. **Upload Proof & Vote**
   - Upload your `proofs.json` file
   - Review all candidates
   - Click "Vote for this Candidate"
   - Confirm transaction in MetaMask
   - Receive BAL tokens automatically

4. **View Results**
   - See live vote counts
   - View percentage distribution
   - Check total votes cast

### Voter Proof Distribution

Generate and distribute proof files to voters:

```bash
# Generate proofs
npx hardhat run scripts/generateProofs.ts

# The proofs.json file will be at: data/proofs/proofs.json
# Distribute this file to voters, or provide individual proofs per address
```

**Proof File Format:**
```json
{
  "0x669b237a521621a7bc242a18b94f695f52340b9a": [
    "0xproof1...",
    "0xproof2...",
    "0xproof3..."
  ],
  "0xAnotherAddress...": [
    "0xproof1...",
    "0xproof2..."
  ]
}
```

Each voter needs their proof array from the `proofs.json` file to vote.

---

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
| `checkWindow.ts`     | View voting window      | `VOTING_ADDR_SEPOLIA`                  |
| `checkResults.ts`    | View vote tallies       | `VOTING_ADDR_SEPOLIA`                  |
| `checkBALBalance.ts` | Check BAL token balance | `BAL_TOKEN_ADDR_SEPOLIA`, `VOTER_ADDR` |

### Voter Scripts

| Script              | Purpose                                | Required Env Vars                                                  |
| :------------------ | :------------------------------------- | :----------------------------------------------------------------- |
| `generateProofs.ts` | Generate Merkle proofs from voter list | `VOTERS_FILE` or `--voters` flag                                   |
| `voteFromProof.ts`  | Submit a vote with Merkle proof        | `VOTER_ADDR`, `CANDIDATE_ID`, `PROOFS_PATH`, `VOTING_ADDR_SEPOLIA` |

---

## Adding Voters to Allowlist

### Method 1: Manual List (Recommended for Testing)

Create `data/voters.json`:

```json
[
  "0x669b237a521621a7bc242a18b94f695f52340b9a",
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
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

---

## Deployment Checklist

- [ ] Contracts compiled successfully
- [ ] Deployed to Sepolia (3 contract addresses saved)
- [ ] Backend environment variables updated in `.env`
- [ ] Frontend environment variables updated in `frontend/.env.local`
- [ ] Contract ABIs copied to frontend
- [ ] Candidates set via `addCandidate.ts`
- [ ] Voting window set via `startElection.ts`
- [ ] Voter list created in `data/voters.json`
- [ ] Merkle proofs generated
- [ ] Merkle root set on-chain via `setRoot.ts`
- [ ] Minter permission granted via `setMinter.ts`
- [ ] Frontend running successfully
- [ ] Test vote successful
- [ ] Results display correctly

---

## Troubleshooting

### Backend Issues

#### "AlreadyVoted()" Error
Each address can only vote once. Use a different wallet address or redeploy the contract for testing.

#### "InvalidProof()" Error
- Ensure your address is in `data/voters.json`
- Regenerate proofs after modifying the voter list
- Update the Merkle root on-chain with `setRoot.ts`

#### "VotingClosed()" Error
Check the voting window with `checkWindow.ts`. Ensure current time is between start and end times.

#### "Missing env: VOTING_ADDR" Error
Make sure you're using `VOTING_ADDR_SEPOLIA` for Sepolia network operations.

#### Contract Functions Not Found
After updating contracts:
1. Recompile: `npx hardhat compile`
2. Redeploy to get a new contract instance
3. Update contract addresses in both `.env` files
4. Copy new ABIs to frontend

### Frontend Issues

#### "Contract not found" or "Cannot read properties" Error
- Verify contract addresses in `frontend/.env.local` match your deployment
- Ensure you copied the correct ABI files to `frontend/src/contracts/`
- Check that your Alchemy RPC URL is correct

#### Proof Upload Not Working
- Ensure the `proofs.json` file contains your wallet address
- Check that the file format is correct (JSON object with addresses as keys)
- Verify you're connected with the same wallet address that's in the proofs file

#### Transaction Fails
- Ensure you have enough Sepolia ETH for gas
- Check that you're connected to Sepolia network in MetaMask
- Verify the election is currently active
- Make sure you haven't already voted

#### MetaMask Shows Wrong Network
Switch to Sepolia testnet in MetaMask:
1. Open MetaMask
2. Click network dropdown
3. Select "Sepolia test network"
4. If not visible, enable "Show test networks" in MetaMask settings

#### "Insufficient Funds" Error
Get Sepolia ETH from a faucet:
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- [Chainlink Sepolia Faucet](https://faucets.chain.link/sepolia)

---

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

# Run frontend in development mode
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build
```

---

## Project Structure

```
.
├── contracts/
│   ├── Voting.sol              # Main voting contract
│   ├── BALToken.sol            # ERC20 reward token
│   └── CandidateNFT.sol        # NFT for candidates
├── ignition/
│   └── modules/
│       └── VotingModule.ts     # Deployment module
├── scripts/
│   ├── addCandidate.ts         # Set candidates
│   ├── startElection.ts        # Set voting window
│   ├── setRoot.ts              # Set Merkle root
│   ├── setMinter.ts            # Grant minting permission
│   ├── generateProofs.ts       # Generate Merkle proofs
│   ├── voteFromProof.ts        # Cast a vote
│   ├── checkCandidates.ts      # View candidates
│   ├── checkWindow.ts          # View voting window
│   ├── checkResults.ts         # View vote tallies
│   ├── checkBALBalance.ts      # Check token balance
│   └── utils.ts                # Shared utilities
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectWallet.tsx
│   │   │   ├── ElectionStatus.tsx
│   │   │   ├── CandidateList.tsx
│   │   │   └── BALBalance.tsx
│   │   ├── contracts/
│   │   │   ├── index.ts
│   │   │   ├── Voting.json
│   │   │   └── BALToken.json
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.local              # Frontend env vars (DO NOT COMMIT)
│   └── package.json
├── data/
│   ├── voters.json             # List of eligible voters
│   └── proofs/
│       ├── proofs.json         # Generated Merkle proofs
│       └── root.txt            # Merkle root hash
├── test/                       # Contract tests
├── .env                        # Backend env vars (DO NOT COMMIT)
├── hardhat.config.ts           # Hardhat configuration
└── README.md                   # This file
```

---

## Security Notes

- Never commit `.env` or `frontend/.env.local` files (contains private keys)
- Never share your private key with anyone
- The example private key in this README is for format reference only - never use it with real funds
- Use testnet (Sepolia) for development and testing
- Audit contracts thoroughly before mainnet deployment
- Keep Merkle proofs secure (they prove voting eligibility)
- Use hardware wallets for mainnet deployments
- Consider implementing rate limiting for proof distribution
- Monitor contract events for suspicious activity

---

## Production Deployment

### Build Frontend for Production

```bash
cd frontend
npm run build
```

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Add: VITE_SEPOLIA_RPC_URL, VITE_VOTING_CONTRACT_ADDRESS, etc.
```

### Deploy Frontend to Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
# Or use Netlify CLI: netlify deploy --prod --dir=dist
```

### Mainnet Deployment Considerations

Before deploying to mainnet:

1. **Audit Contracts**: Get professional security audit
2. **Test Thoroughly**: Complete all scenarios on testnet
3. **Update RPC URLs**: Use mainnet RPC endpoints
4. **Gas Optimization**: Review gas costs for all functions
5. **Emergency Procedures**: Plan for pause/upgrade mechanisms
6. **Monitoring**: Set up event monitoring and alerts
7. **Documentation**: Provide clear user instructions
8. **Legal Review**: Ensure compliance with local regulations

---

## Next Steps & Future Enhancements

- [ ] Add candidate profiles with images and descriptions
- [ ] Implement result charts and data visualizations
- [ ] Create admin dashboard for election management
- [ ] Add voting history and audit trail
- [ ] Implement multi-language support
- [ ] Add dark mode theme
- [ ] Create mobile app version (React Native)
- [ ] Add email/SMS notifications for election events
- [ ] Implement delegated voting mechanisms
- [ ] Add ranked-choice voting option
- [ ] Create analytics dashboard for administrators
- [ ] Implement gasless transactions (meta-transactions)
- [ ] Add IPFS integration for decentralized proof storage

---

## Testing

Run the test suite:

```bash
# Run all tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Run specific test file
npx hardhat test test/Voting.test.ts

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

---

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)
- [Merkle Trees Explained](https://en.wikipedia.org/wiki/Merkle_tree)
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Etherscan Sepolia](https://sepolia.etherscan.io/)
- [MetaMask Documentation](https://docs.metamask.io/)

---

## Acknowledgments

- OpenZeppelin for secure contract libraries
- Hardhat team for development tools
- Wagmi team for React hooks
- Ethereum Foundation for the platform