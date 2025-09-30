// scripts/checkProofs.ts
import * as fs from 'fs';


async function main() {
    const proofsPath = process.env.PROOFS_PATH || './data/proofs/proofs.json';
    const rootPath = './data/proofs/root.txt';

    console.log(`\n📋 Checking proofs file: ${proofsPath}\n`);

    if (!fs.existsSync(proofsPath)) {
        console.error(`❌ Proofs file not found at ${proofsPath}`);
        return;
    }

    const proofsData = JSON.parse(fs.readFileSync(proofsPath, 'utf8'));
    const addresses = Object.keys(proofsData);

    console.log(`✅ Found ${addresses.length} address(es) in proofs:\n`);
    addresses.forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
        console.log(`      Proof length: ${proofsData[addr].length} hashes`);
    });

    if (fs.existsSync(rootPath)) {
        const root = fs.readFileSync(rootPath, 'utf8').trim();
        console.log(`\n🌳 Current Merkle root: ${root}`);
    } else {
        console.log(`\n⚠️  No root.txt file found`);
    }

    console.log(`\n💡 Your wallet (from .env): ${process.env.SEPOLIA_PRIVATE_KEY ?
        '0x' + require('ethers').Wallet.createRandom().address : 'Not set'}`);

    console.log(`\n📝 To add your address, run:`);
    console.log(`   npx hardhat run scripts/generateProofs.ts --voters YOUR_ADDRESS\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });