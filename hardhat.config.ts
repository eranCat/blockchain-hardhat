import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ignition-viem";
import type { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL!,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY!]
    }
  }
};

export default config;