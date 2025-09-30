// scripts/simulateWindow.ts
import { requireEnv, getVoting as getVotingContract } from "./utils.js";


function parseIsoToEpochSeconds(name: string): bigint {
    const raw = requireEnv(name);
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) throw new Error(`Invalid ${name}: "${raw}"`);
    return BigInt(Math.floor(ms / 1000));
}

async function main() {


    const start = parseIsoToEpochSeconds("ELECTION_START_ISO");
    const end = parseIsoToEpochSeconds("ELECTION_END_ISO");
    if (start >= end) throw new Error(`Bad window: start (${start}) must be < end (${end})`);

    const voting = await getVotingContract();

    console.log(`Simulating setWindow(${start}, ${end})...`);
    try {
        // viem contract instances expose simulate.* when available
        const sim = await voting.simulate.setWindow([start, end]);
        console.log("✅ Simulation ok. Request:", sim.request);
        console.log("You can now send the tx safely.");
    } catch (e: any) {
        console.error("❌ Simulation reverted.");
        // viem usually includes a decoded error or raw data here
        console.error("Name:", e.name);
        console.error("Short:", e.shortMessage);
        console.error("Reason:", e.reason);
        console.error("Data:", e.data);
        console.error("Raw:", e.raw);
        console.error("Meta:", e.metaMessages);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
