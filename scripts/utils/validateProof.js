const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const fs = require('fs');
const path = require('path');

/**
 * Validate Merkle proofs offline before submission
 * Usage: node scripts/utils/validateProof.js 0xVoterAddress
 */

function main() {
    const address = process.argv[2];

    if (!address || !address.startsWith('0x')) {
        console.error('Usage: node scripts/utils/validateProof.js 0xAddress');
        process.exit(1);
    }

    console.log('🔍 Validating proof for:', address, '\n');

    // Load files
    const treePath = path.join(__dirname, '../../data/proofs/tree.json');
    const proofsPath = path.join(__dirname, '../../data/proofs/proofs.json');
    const rootPath = path.join(__dirname, '../../data/proofs/root.txt');

    if (!fs.existsSync(treePath)) {
        console.error('❌ Tree file not found:', treePath);
        console.error('Run: npx hardhat run scripts/generateProofs.ts');
        process.exit(1);
    }

    const tree = StandardMerkleTree.load(JSON.parse(fs.readFileSync(treePath, 'utf8')));
    const proofs = JSON.parse(fs.readFileSync(proofsPath, 'utf8'));
    const root = fs.readFileSync(rootPath, 'utf8').trim();

    const normalizedAddr = address.toLowerCase();
    const proof = proofs[normalizedAddr];

    if (!proof) {
        console.error('❌ Address not in allowlist');
        console.error('Available addresses:', Object.keys(proofs).length);
        process.exit(1);
    }

    // Verify proof against root
    const leaf = [normalizedAddr];
    let isValid = false;

    try {
        for (const [i, v] of tree.entries()) {
            if (v[0] === normalizedAddr) {
                const calculatedProof = tree.getProof(i);
                isValid = JSON.stringify(calculatedProof) === JSON.stringify(proof);
                break;
            }
        }
    } catch (err) {
        console.error('❌ Verification failed:', err.message);
        process.exit(1);
    }

    // Results
    console.log('Merkle Root:', root);
    console.log('Address:', address);
    console.log('Proof length:', proof.length, 'hashes');
    console.log('\nProof:');
    proof.forEach((hash, i) => console.log(`  [${i}]`, hash));

    console.log('\n' + (isValid ? '✅ VALID' : '❌ INVALID'));

    if (isValid) {
        console.log('\n📋 Ready for voting transaction');
        console.log('Use this proof array in your vote call\n');
    }
}

main();