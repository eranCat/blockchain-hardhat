import "@nomicfoundation/hardhat-toolbox-viem";
import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

import * as dotenv from "dotenv";
dotenv.config(); // <<< this actually loads .env

if (!process.env.SEPOLIA_RPC_URL) {
  throw new Error("Missing SEPOLIA_RPC_URL in .env");
}
if (!process.env.SEPOLIA_PRIVATE_KEY) {
  throw new Error("Missing SEPOLIA_PRIVATE_KEY in .env");
}


const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatToolboxViem],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY],
    },
  },
  ignition: {
    requiredConfirmations: 1,
  },
};

export default config;
