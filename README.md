# Voting Project with BALToken & Merkle Proofs

A minimal voting system: owner publishes candidates + Merkle root, users submit votes via proof, winners get BAL token rewards. Includes smart contracts, deployment, and frontend.

---

## Prerequisites

- Node.js ≥ 18  
- npm (or pnpm / yarn)  
- A `.env` file in project root with:

```

SEPOLIA_RPC_URL=<your Sepolia JSON-RPC endpoint>
PRIVATE_KEY=<your deployer / admin private key>
ETHERSCAN_API_KEY=<your Etherscan API key>

````

- Add `.env` to `.gitignore` (do **not** commit secrets).

---

## Installation

```bash
npm install
````

If you haven’t yet, also enable Hardhat + Viem plugin (see below).

---

## Hardhat & Viem Setup

We use the `@nomicfoundation/hardhat-viem` plugin so you can use `hre.viem` helpers for reading/writing contracts. ([Hardhat][1])

In your `hardhat.config.ts`, ensure:

```ts
import "@nomicfoundation/hardhat-viem";
// … other imports

const config: HardhatUserConfig = {
  // solidity, networks, etc.
  plugins: [
    // … other plugins
    "@nomicfoundation/hardhat-viem",
  ],
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    // other networks...
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
```

After this, in scripts/tests you can do:

```ts
const { viem } = await network.connect();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();
const myContract = await viem.deployContract("Voting", [/* args */]);

await myContract.write.vote([proof]);
const result = await myContract.read.getResult();
```

This approach is described in the docs. ([v2.hardhat.org][2])

---

## 📄 Scripts (npm)

These scripts streamline dev & release tasks:

| Script                                  | Description                                                        | Usage                                 |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| `npm run clean`                         | Deletes build artifacts: `cache/`, `dist/`, `artifacts/`, `build/` | `npm run clean`                       |
| `npm run compile`                       | Compile contracts via Hardhat                                      | `npm run compile`                     |
| `npm run test`                          | Run full test suite (unit & integration)                           | `npm run test`                        |
| `npm run deploy -- --network <network>` | Deploy your contracts / modules to a specified network             | `npm run deploy -- --network sepolia` |
| `npm run full`                          | Alias: clean → compile → test in sequence                          | `npm run full`                        |

> **Note:** The `clean` script uses `npx rimraf` for cross-platform deletion. Make sure `rimraf` is installed as dev dependency:

```bash
npm install --save-dev rimraf
```

---

## Example Workflow

```bash
npm run clean
npm run compile
npm run test
npm run deploy -- --network sepolia
```

Or all in one:

```bash
npm run full && npm run deploy -- --network sepolia
```

---

## Project Structure (suggested)

```
/contracts
  Voting.sol
  BALToken.sol
  CandidateNFT.sol
/ignition
  modules
    VotingModule.ts
/scripts
  admin
    setRoot.ts
    openWindow.ts
    closeWindow.ts
    seedCandidates.ts
  read
    results.ts
/tests
  voting.e2e.ts
  unit/…
/frontend
  src
    contracts/
      ABIs + addresses JSON
    pages/
      Voter.tsx
      Admin.tsx
.gitignore
.env
hardhat.config.ts
package.json
README.md
```

---

## Development & Testing Steps

1. **Clean, compile, test locally**

   ```bash
   npm run clean
   npm run compile
   npm run test
   ```

2. **Deploy locally (Ignition / Hardhat script)**

   ```bash
   npx hardhat ignition deploy ignition/modules/VotingModule.ts
   ```

3. **Deploy & verify on Sepolia**

   ```bash
   npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia --verify
   ```

   Or with generic deploy:

   ```bash
   npm run deploy -- --network sepolia
   ```

4. **Frontend integration**

   * Copy ABIs and deployed addresses into `frontend/src/contracts/`
   * In frontend, use Viem (or other library) to interact with your deployed contracts: view candidates, submit vote with proof, display BAL token balance, admin controls.

---

## Enhancements (future ideas)

* Mint “Voted” badge NFT per vote
* Event indexing / snapshot service for UI
* Emergency pause / admin shutdown
* Gas optimizations, profiling & benchmarking
* Frontend UX improvements, validation, error handling

---

## References & Resources

* Hardhat + Viem plugin & usage docs ([Hardhat][1])
* MerkletreeJS integration with Solidity proof verification
* OpenZeppelin v5 patterns (ERC721 `_update`, custom errors)
* Hardhat Ignition for deploy/verify modules

