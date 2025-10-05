import { keccak256, encodePacked, encodeAbiParameters } from "viem";

const address = "0x669b237a521621a7Bc242a18B94f695f52340B9A";

// Contract uses encodePacked
const leafPacked = keccak256(encodePacked(["address"], [address as `0x${string}`]));
console.log("encodePacked leaf:", leafPacked);

// StandardMerkleTree uses encode
const leafEncoded = keccak256(encodeAbiParameters(
    [{ type: "address" }],
    [address as `0x${string}`]
));
console.log("encode leaf:      ", leafEncoded);

console.log("\nFor single-address tree:");
console.log("Root should be:   ", leafPacked);