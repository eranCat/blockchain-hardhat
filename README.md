# Elections 2025 – Decentralized Voting DApp

Time-bounded voting with a Merkle-tree voter registry, optional questionnaire matching (distance algorithm), and ERC-20 rewards. Frontend is React + Wagmi; contracts are Solidity + Hardhat. Winner is revealed **only after** election end. Each `startNewElection(...)` bumps the election id so previous votes do not carry over.

---

## Table of contents

- [Elections 2025 – Decentralized Voting DApp](#elections-2025--decentralized-voting-dapp)
  - [Table of contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Quick summary (one-line)](#quick-summary-one-line)
  - [Full run flow (detailed)](#full-run-flow-detailed)
    - [1) Install \& compile](#1-install--compile)
    - [2) Generate proofs (standalone; optional if using `deployAndStartElection.ts`)](#2-generate-proofs-standalone-optional-if-using-deployandstartelectionts)
    - [3) Start a local node (if testing locally)](#3-start-a-local-node-if-testing-locally)
    - [4) One-command deploy \& start election (recommended)](#4-one-command-deploy--start-election-recommended)
    - [5) Manual alternative: deploy \& start steps (split)](#5-manual-alternative-deploy--start-steps-split)
    - [6) Frontend: run \& vote](#6-frontend-run--vote)
  - [Post-deploy steps (what to copy into envs \& where)](#post-deploy-steps-what-to-copy-into-envs--where)
  - [Files \& useful scripts](#files--useful-scripts)
  - [Contracts — detailed explanations](#contracts--detailed-explanations)
    - [Voting.sol (Ownable)](#votingsol-ownable)
    - [BALToken.sol (ERC-20 reward token)](#baltokensol-erc-20-reward-token)
    - [CandidateNFT.sol (ERC-721) — if present](#candidatenftsol-erc-721--if-present)
  - [Merkle leaf \& proof format (OpenZeppelin standard)](#merkle-leaf--proof-format-openzeppelin-standard)
  - [Frontend behavior — user steps \& checks](#frontend-behavior--user-steps--checks)
  - [Verification \& troubleshooting](#verification--troubleshooting)
  - [Example `.env` files](#example-env-files)
  - [Security notes \& recommended checks](#security-notes--recommended-checks)
  - [FAQ](#faq)

---

## Prerequisites

* Node.js 18+ (LTS recommended)  
* npm (or pnpm/yarn)  
* `npx` available  
* Hardhat (devDeps)  
* A Sepolia RPC key (Infura/Alchemy) and a funded deployer private key if deploying to Sepolia  
* MetaMask installed (for the frontend)  
* Git (recommended)

---

## Quick summary (one-line)

1. Generate voter Merkle proofs from a list of addresses.  
2. Deploy contracts (BALToken, CandidateNFT, Voting).  
3. Start a new election (deploy script does this in one command).  
4. Copy printed env values into the root `.env` and `frontend/.env.local`.  
5. Run the frontend, upload `data/proofs/proofs.json`, connect a wallet that exists in the proofs and vote.  
6. After the election ends, the UI will show the winner and voters can claim rewards (if applicable).

---

## Full run flow (detailed)

> Use these commands from the project root. Where `--network sepolia` is used, replace with `localhost` for local testing.

### 1) Install & compile

```bash
npm install
npx hardhat compile
# (optional) cd frontend && npm install && cd ..
````

### 2) Generate proofs (standalone; optional if using `deployAndStartElection.ts`)

If you want to generate proofs by yourself:

```bash
# Edit .env to include VOTER_ADDRESSES or pass as CLI flags (script supports --voters)
npx tsx scripts/generateProofs.ts --voters "0xAa...,0xBb...,0xCc..."
# Output:
# ✅ Merkle root: 0x<root>
# 📝 Wrote data/proofs/proofs.json & data/proofs/tree.json
```

`data/proofs/proofs.json` and `tree.json` are produced — keep them for the frontend upload.

### 3) Start a local node (if testing locally)

In terminal 1:

```bash
npm run node
# or: npx hardhat node
```

### 4) One-command deploy & start election (recommended)

This script automates: generate proofs (from VOTER_ADDRESSES), deploy contracts, call `startNewElection(...)`, copy ABIs to frontend.

```bash
npx hardhat run scripts/deployAndStartElection.ts --network sepolia
```

**Expected final printed block (copy these values):**

```
VOTING_ADDR_SEPOLIA=0x...
VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...
VOTER_MERKLE_ROOT=0x...
```

**Where to place them:**

* Root `.env` (used by scripts):

```ini
VOTING_ADDR_SEPOLIA=0x...
VOTER_MERKLE_ROOT=0x...
```

* Frontend `frontend/.env.local`:

```ini
VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

> Restart the frontend dev server after updating envs.

### 5) Manual alternative: deploy & start steps (split)

If you prefer step-by-step:

1. Deploy contracts:

   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```

   The script prints addresses, e.g. `VOTING_ADDR=0x...`.

2. Generate proofs (if not already):

   ```bash
   npx tsx scripts/generateProofs.ts --voters "0x1,0x2,0x3"
   ```

3. Start new election with printed values:

   ```bash
   npx tsx scripts/startElection.ts --network sepolia --root <root> --start <start_ts> --end <end_ts> --names "Alice,Bob"
   ```

(Exact helper filenames may vary; the one-command script bundles the above.)

### 6) Frontend: run & vote

```bash
cd frontend
npm run dev
# open the dev URL (usually http://localhost:5173)
```

1. Connect MetaMask.
2. Click **Upload** → select `data/proofs/proofs.json` (generated earlier or by the deploy script).
3. Connect a wallet that appears in `VOTER_ADDRESSES`.
4. Select candidate → **Submit Vote**.
5. UI will show `You voted to <name>` after success and disable voting for that address for the current election.

---

## Post-deploy steps (what to copy into envs & where)

After running the deploy script, copy the printed values into these files:

**Root `.env`** (for scripts/tools)

```ini
VOTING_ADDR_SEPOLIA=0x...
VOTER_MERKLE_ROOT=0x...
SEPOLIA_PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**Frontend `frontend/.env.local`**

```ini
VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

---

## Files & useful scripts

* `scripts/deployAndStartElection.ts` — one-shot: generate proofs (from VOTER_ADDRESSES), deploy contracts, call `startNewElection(...)`, copy ABIs to frontend, and print env values.
* `scripts/generateProofs.ts` — produce `data/proofs/tree.json` and `data/proofs/proofs.json` from `VOTER_ADDRESSES`.
* `scripts/checkState.ts` — prints contract address, candidates, window timestamps (UTC + UNIX), merkle root, active flag.
* `scripts/setRoot.ts` — admin helper to set the on-chain root (manual flow).
* `frontend/src/contracts/` — copied ABIs after a deploy (used by the frontend).

---

## Contracts — detailed explanations

This section explains the main smart contracts and what each key storage item / function does. Use these during defense and debugging.

### Voting.sol (Ownable)

**Purpose:** Main election contract. Manages candidates, election windows, per-election vote tracking, Merkle root used to verify voter eligibility, vote counting, and reward distribution bookkeeping.

**Key storage (conceptual):**

* `currentElectionId` — increments each time `startNewElection` is called.
* `candidates[]` — array of candidate structs (name, positions, voteCount).
* `voterMerkleRoot` — bytes32 Merkle root for current election.
* `lastVotedElection[address]` — maps voter address → last election id they voted in (prevents double voting in same election).
* `startTime`, `endTime` — timestamps for current election window.
* `owner` — contract owner (from `Ownable`).

**Important public views:**

* `getAllCandidates()` → returns candidate names/positions/voteCounts (used by frontend).
* `startTime()` / `endTime()` — read window.
* `isActive()` → `block.timestamp >= start && block.timestamp <= end`.
* `hasVoted(address)` — returns whether the address has voted in the current election (using `lastVotedElection`).

**Key functions:**

* `startNewElection(uint256 start, uint256 end, string[] names, int[][] positions, bytes32 root)` — onlyOwner: increments `currentElectionId`, replaces candidates, resets votes for the new election, writes `voterMerkleRoot`, sets window.

  * Important: this bumps electionId so previously set `lastVotedElection` values don't block the new election.
* `voteWithProof(uint256 candidateId, bytes32[] proof)` — validate Merkle proof, check election active, ensure caller hasn't voted in the current election, increment vote count and record in `lastVotedElection`.
* `voteByQuestionnaire(...)` — optional: match voter answers to candidate positions using some distance metric (Euclidean or variant) and silently select the closest candidate (used for the bonus feature).
* `claimReward()` or `distributeRewards()` — reward logic (depends on design). In the default flow rewards may require claim; check the project scripts.

**Events (typical):**

* `Voted(address voter, uint256 electionId, uint256 candidateId)`
* `ElectionStarted(uint256 electionId, uint256 start, uint256 end)`
* `CandidateAdded(uint256 candidateId, string name)`

> The UI listens to `Voted` events (or polls) to auto-refresh results during the election.

### BALToken.sol (ERC-20 reward token)

**Purpose:** ERC-20 reward token (symbol `BAL` in project). Used to distribute rewards to voters after an election (either automatically or via claim).

**Key behaviors:**

* Uses OpenZeppelin ERC-20 base.
* `mint()` — called by the owner (or Voting contract if granted minter role) to mint rewards to winners or voters.
* May include `decimals()` = 18 standard.

**Notes:** If token minting is gated (owner-only), ensure the Voting contract is authorized to mint (the deploy script usually authorizes `Voting` as a minter).

### CandidateNFT.sol (ERC-721) — if present

**Purpose (project requirement):** Candidate NFTs that keep ownership history; transfers may charge a royalty (e.g., 10% to creator) — check the actual contract for the transfer hook or royalty implementation.

**Key behaviors to check:**

* `mintCandidateNFT()` — minting flow for candidate identity (if implemented).
* `transfer` overrides or marketplace hooks to collect creator fees.

---

## Merkle leaf & proof format (OpenZeppelin standard)

Leaves are computed as (OZ Standard used in the project):

```
leaf = keccak256(bytes.concat( keccak256(abi.encode(address)) ))
```

* `generateProofs.ts` produces `data/proofs/proofs.json` where each address maps to `{ leaf, proof[] }` and `tree.json` (full tree from the OZ standard library).
* On-chain verification uses the same leaf encoding — mismatch causes "Invalid proof" reverts.

---

## Frontend behavior — user steps & checks

* Upload `data/proofs/proofs.json` (or `tree.json`) via the UI.
* The UI verifies that the uploaded `root` equals the contract `voterMerkleRoot` — if not equal, voting is blocked.
* If root matches, and wallet address is in the list, voting UI enables.
* After voting, UI shows `You voted to <name>` and disables the vote button for that wallet (for current election).
* Results: progress bars updated via `Voted` events and a scheduled refresh. Winner banner only shown after `endTime`.

---

## Verification & troubleshooting

**Check contract state**

```bash
npx hardhat run scripts/checkState.ts --network sepolia
# Expected output should include:
# Contract: 0x...
# Voting session id: <n>
# Voting window (unix): <start> -> <end>
# Voting window (UTC): <ISO start> -> <ISO end>
# Merkle root (on-chain): 0x...
```

**Common issues & fixes**

* `Invalid proof` / vote reverts:

  * Uploaded root ≠ on-chain root — re-upload correct `proofs.json` or re-run deploy (if you regenerated the tree).
  * Connected wallet not present in `VOTER_ADDRESSES`.
  * Election not active (check start/end timestamps).
* Results not updating:

  * UI listens to events and polls — try a manual refresh.
* New election shows old candidates or voters cannot vote:

  * Ensure you used `startNewElection(...)` (it increments `currentElectionId`).
  * If you manually set root without bumping election id, `lastVotedElection` checks may still block voters.

---

## Example `.env` files

**Root `.env`**

```ini
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_KEY

VOTER_ADDRESSES=0xAAA...,0xBBB...,0xCCC...

# Optional: If you used the one-command script, paste the following from the script's output:
VOTING_ADDR_SEPOLIA=0x...
VOTER_MERKLE_ROOT=0x...
```

**Frontend `frontend/.env.local`**

```ini
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...
```

---

## Security notes & recommended checks

* Always verify that the `Voting` contract has only the necessary privileges (minter role to the token only if intended).
* Check `startNewElection` access control — should be `onlyOwner` or admin-protected.
* Watch for reentrancy on any functions that transfer tokens — use OpenZeppelin `ReentrancyGuard` where required.
* Test extreme cases: empty candidate list, no voters, overlapping windows, and multiple rapid `startNewElection` calls.
* Keep private keys out of version control. Never commit `.env` files.

---

## FAQ

**Q:** Do I need to manually copy ABIs into the frontend?
**A:** No — `deployAndStartElection.ts` copies ABIs into `frontend/src/contracts/`.

**Q:** Do I need to pre-place the root in `.env` before running the deploy script?
**A:** No — the script builds the root from `VOTER_ADDRESSES` and prints the resulting `VOTER_MERKLE_ROOT` for you to paste.

**Q:** How to reset voters between elections?
**A:** Use `startNewElection(...)`; it increments the `currentElectionId` and therefore voters can vote again since `lastVotedElection` is election-specific.

---

