// scripts/check-viem.ts
import { network } from "hardhat";
const { viem } = await network.connect();
console.log(!!viem ? "viem is available" : "viem is MISSING");
