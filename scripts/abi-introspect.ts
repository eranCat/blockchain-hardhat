import path from "node:path";
import { readFileSync } from "node:fs";

function listFunctions(artifactPath: string, label: string) {
    const json = JSON.parse(readFileSync(artifactPath, "utf8"));
    const abi = json.abi as Array<any>;
    const fns = abi.filter((e) => e.type === "function");
    console.log(`\n=== ${label} functions (${fns.length}) ===`);
    for (const fn of fns) {
        const sig = `${fn.name}(${(fn.inputs || []).map((i: any) => i.type).join(",")}) -> ${fn.stateMutability}`;
        console.log(sig);
    }
}

(function main() {
    const votingPath = path.resolve("artifacts/contracts/Voting.sol/Voting.json");
    const nftPath = path.resolve("artifacts/contracts/CandidateNFT.sol/CandidateNFT.json");

    listFunctions(votingPath, "Voting");
    listFunctions(nftPath, "CandidateNFT");
})();
