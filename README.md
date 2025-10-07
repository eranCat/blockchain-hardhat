# Elections 2025 – Decentralized Voting DApp

Time-bounded voting with a Merkle-tree registry, optional questionnaire matching, and ERC-20 rewards. Frontend is React + Wagmi; contracts are Solidity + Hardhat. Winner is revealed **only after** the election ends. Each new election resets voter eligibility.

---

## Contents

- [Elections 2025 – Decentralized Voting DApp](#elections-2025--decentralized-voting-dapp)
  - [Contents](#contents)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Environment](#environment)
    - [Root `.env` (Hardhat)](#root-env-hardhat)
    - [Frontend `.env.local` (Vite)](#frontend-envlocal-vite)
  - [One-Command Deploy \& Start Election](#one-command-deploy--start-election)
    - [What the script does](#what-the-script-does)
    - [Post-deploy: copy printed values into envs](#post-deploy-copy-printed-values-into-envs)
    - [Front-end launch \& first vote](#front-end-launch--first-vote)
  - [Contracts](#contracts)
    - [Election lifecycle](#election-lifecycle)
    - [Merkle proofs (Standard)](#merkle-proofs-standard)
  - [Frontend behavior](#frontend-behavior)
  - [Scripts reference](#scripts-reference)
  - [Verification \& troubleshooting](#verification--troubleshooting)
  - [Common Q\&A](#common-qa)
  - [Tech](#tech)

---

## Prerequisites

* **Node.js** 18+ (LTS recommended)
* **PNPM/NPM** (examples use npm)
* **Hardhat** (installed via dev deps)
* **A Sepolia RPC** (Alchemy/Infura) & a funded deployer key

---

## Install

```bash
# from project root
npm install
npx hardhat compile

# frontend deps
cd frontend && npm install && cd ..
```

---

## Environment

### Root `.env` (Hardhat)

Create a `.env` in the project root:

```ini
# RPC + deployer
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Voter registry: comma OR space separated addresses
VOTER_ADDRESSES=0x111...,0x222...,0x333...

# Candidates
CANDIDATE_NAMES=Alice,Bob,Charlie
# Optional policy positions per candidate: [[econ,social,foreign]] each 0..10
# If omitted, defaults are used for the given names
# CANDIDATE_POSITIONS_JSON=[[4,6,5],[6,4,5],[5,5,6]]

# Election timing (pick ONE style)
# A) Relative (default if absolute not provided)
ELECTION_START_OFFSET_SEC=60
ELECTION_DURATION_SEC=2592000    # 30d

# B) Absolute (overrides relative)
# ELECTION_START_TS=1730890000
# ELECTION_END_TS=1733482000
```

> You **do not** need to set `VOTING_ADDR_SEPOLIA` or `VOTER_MERKLE_ROOT` manually before deploy; the script prints them for you to paste afterwards.

### Frontend `.env.local` (Vite)

Create `frontend/.env.local`:

```ini
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA will be pasted after deploy
```

---

## One-Command Deploy & Start Election

Run:

```bash
npx hardhat run scripts/deployAndStartElection.ts --network sepolia
```

### What the script does

1. Builds a **Standard Merkle Tree** from `VOTER_ADDRESSES`
2. Writes `data/proofs/tree.json` and `data/proofs/proofs.json`
3. Deploys `Voting`
4. Calls `startNewElection(start, end, names, positions, root)`

   * replaces candidates
   * sets window
   * sets voter root
   * **bumps election id** so previous votes don’t carry over
5. **Copies ABIs** into `frontend/src/contracts/`
6. Prints three lines:

   ```
   VOTING_ADDR_SEPOLIA=0x...
   VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...
   VOTER_MERKLE_ROOT=0x...
   ```

### Post-deploy: copy printed values into envs

From the script output, **copy/paste** exactly as follows:

* In **root** `.env` (used by scripts):

  ```ini
  VOTING_ADDR_SEPOLIA=0x...       # paste from script output
  VOTER_MERKLE_ROOT=0x...         # paste from script output
  ```
* In **frontend/.env.local** (used by Vite):

  ```ini
  VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=0x...   # paste from script output
  ```

> **Restart the frontend dev server** after updating envs so it picks up the new address & ABIs.

### Front-end launch & first vote

```bash
cd frontend
npm run dev
```

In the UI:

1. Click **Upload** and select `data/proofs/proofs.json`
2. Connect a wallet that’s listed in `VOTER_ADDRESSES`
3. Select a candidate → **Submit Vote**
4. After confirmation, the panel switches to: `You voted to <name>`

---

## Contracts

* `Voting.sol` (Ownable): manages candidates, windows, voter root, and votes
* Merkle verification uses **OpenZeppelin Standard** leaf format
* New elections are created via `startNewElection(...)` which resets who can vote

### Election lifecycle

* `startNewElection(start,end,names,positions,root)`

  * `currentElectionId` increments
  * candidate list replaced; vote counts start at 0
  * `lastVotedElection[address]` causes all addresses to be eligible to vote again
* Public views used by the frontend:

  * `getAllCandidates() → (names, positions, votes)`
  * `startTime()`, `endTime()`, `isActive()`
  * `hasVoted(address)` (per election)

### Merkle proofs (Standard)

Leaves are computed as:

```
leaf = keccak256(bytes.concat( keccak256(abi.encode(address)) ))
```

The script and UI generate/consume `proofs.json` accordingly. **Roots must match** the file you upload.

---

## Frontend behavior

* **Proof upload** accepts either OZ Standard dump (`tree.json`) or `{ root, proofs }`
* **Voting panel**

  * Blocks submission if uploaded root ≠ on-chain root
  * After success, shows `You voted to <name>` (and stays disabled)
* **Election status**

  * Reflects `startTime`, `endTime`, and `isActive` (original UI)
* **Election results**

  * Auto-refreshes on `Voted` events (with light polling fallback)
  * Shows progress bars during the election
  * Shows a winner banner **only after** end time

---

## Scripts reference

* `scripts/deployAndStartElection.ts`

  * One-shot deploy → start new election → copy ABIs → write proofs
* `scripts/generateProofs.ts`

  * Standalone proofs generation (OZ Standard) from `VOTER_ADDRESSES`
* `scripts/checkState.ts`

  * Prints contract address, candidate count, window timestamps, current time, and merkle root
* `scripts/setup.ts` (legacy)

  * Multi-step setter calls; use only if you need manual control

---

## Verification & troubleshooting

**Verify state**

```bash
npx hardhat run scripts/checkState.ts --network sepolia
```

Look for:

* `Address` matches your frontend `.env.local`
* `Voting Active: true` (or check start/end)
* `Merkle Root` equals `root` inside `data/proofs/proofs.json`

**Common issues**

* *Vote reverts (“Invalid proof” / simulation fails)*

  * The uploaded root doesn’t match on-chain root → redeploy or re-upload correct file
  * The connected wallet is not in `VOTER_ADDRESSES`
  * Election is not active / candidateId invalid
* *Results don’t update immediately*

  * The UI refetches on `Voted` + polls; if needed, refresh the page
* *New election still shows old candidates or voters can’t vote again*

  * Always use `startNewElection(...)` to reset; the one-command deploy already does this

---

## Common Q&A

**Do I need to run a separate script to copy ABIs?**
No. ABIs are copied into `frontend/src/contracts/` by `deployAndStartElection.ts`.

**Do I need to manually put the root in `.env` before deploying?**
No. The script prints the values to paste afterwards.

**Where do I get proofs for a new election?**
The deploy script regenerates `data/proofs/proofs.json` and `tree.json` each time from `VOTER_ADDRESSES`.

**Can I add/remove voters mid-election?**
Not in this default flow. Create a new election with a new root.

---

## Tech

* Hardhat 2.x, Solidity 0.8.x, OpenZeppelin 5.x
* React 18/19, Wagmi 2.x, Viem 2.x
* Network: Sepolia
