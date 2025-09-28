## Prereqs

* Node.js 20+ (works great with Node 22).
* Hardhat v3 with **Viem toolbox** (already installed by the init).
* OpenZeppelin contracts for token/NFT (installed in this repo).

## Install & Compile

```bash
npm install
npx hardhat compile
```

## Run tests

```bash
npx hardhat test
```

Hardhat v3’s `test` task uses Node’s built-in test runner under the hood (no Mocha needed). ([Hardhat][1])

---

## Networks & Secrets (Sepolia)

Hardhat 3 uses **Configuration Variables** so you don’t need to hardcode secrets in the repo. By default, config variables are read from **environment variables**, and you can also store them encrypted using the **hardhat-keystore** plugin. ([Hardhat][2])

We’ll use two variables:

* `SEPOLIA_RPC_URL` — your HTTPS RPC endpoint (Infura/Alchemy/etc.)
* `SEPOLIA_PRIVATE_KEY` — the private key of the funded Sepolia account used to deploy

### Option A — Store secrets securely (recommended)

1. Set your **RPC URL** as an environment variable (PowerShell example):

```powershell
$env:SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/<YOUR_KEY>"
```

2. Store your **private key** in the **Hardhat keystore** (encrypted):

```bash
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
# paste your 0x... private key; choose a password when prompted
```

`hardhat-keystore` will prompt you for a password and encrypt the value. On deploy, Hardhat asks for that password, decrypts the key, and uses it. ([Hardhat][2])

### Option B — Use a `.env` file (simple)

1. Install dotenv:

```bash
npm i dotenv
```

2. Create a `.env` file in the project root:

```ini
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<YOUR_KEY>
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

3. Load it in your config (see config snippet below). (Environment variables are a first-class source for Hardhat configuration variables.) ([Hardhat][2])

> If you see `Error HHE7: Configuration variable not found`, it means the variable (e.g., `SEPOLIA_PRIVATE_KEY`) wasn’t supplied by any source. Provide it via keystore or env and re-run. ([Hardhat][3])

---

## Hardhat config (make sure this matches)

In `hardhat.config.ts`, use **Configuration Variables** so the same config works with keystore or env:

```ts
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ignition";
import { configVariable } from "hardhat/config";

const config = {
  solidity: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: {
      url: configVariable("SEPOLIA_RPC_URL"),
      // You can pass a single private key string here. The keystore plugin will
      // supply SEPOLIA_PRIVATE_KEY at runtime if you stored it with `hardhat keystore set`.
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
};
export default config;
```

* **Why this works:** `configVariable("NAME")` tells Hardhat “I need `NAME` from any configured source.” By default, that means **environment variables**; when you also use **hardhat-keystore**, the plugin can supply values securely too. If it can’t find a value, you’ll get **HHE7**. ([Hardhat][2])

---

## Deploy with Ignition

### Local

```bash
# terminal A
npx hardhat node

# terminal B
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network localhost
```

### Sepolia

Make sure you set `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` (via keystore or env), then:

```bash
npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia
```

* You’ll be prompted for the **keystore password**, then Hardhat will send the transactions. Re-running the same deploy is idempotent—Ignition detects prior state and won’t resend. ([Hardhat][4])

*(Optional)* To verify contracts on Etherscan during/after Ignition deploys, add your explorer key as another configuration variable (e.g., `ETHERSCAN_API_KEY`) and follow the “Verify with Ignition” guide. ([Hardhat][5])

---

## Common pitfalls

* **HHE7 (config variable not found):** You didn’t provide one of the required variables. Set it via `hardhat keystore set <NAME>` or as an env var before running the task. ([Hardhat][3])
* **Wrong config loaded:** Hardhat finds the **closest `hardhat.config.ts`** starting from your current directory. Run commands from the project root that contains your intended config. ([Hardhat][1])
* **No artifact found:** If you see “artifact not found,” ensure the Solidity file lives under the configured `paths.sources` (default `contracts/`) and re-compile. (Use fully-qualified names like `"contracts/Voting.sol:Voting"` when needed.) ([Hardhat][1])

---

### TL;DR (Sepolia)

1. **Set secrets**

   * Keystore: `npx hardhat keystore set SEPOLIA_PRIVATE_KEY` (enter 0x… and a password)
   * Env: `SEPOLIA_RPC_URL=…` (and optionally `SEPOLIA_PRIVATE_KEY=…` if not using keystore) ([Hardhat][2])
2. **Deploy**
   `npx hardhat ignition deploy ignition/modules/VotingModule.ts --network sepolia` ([Hardhat][4])

