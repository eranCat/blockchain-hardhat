const fs = require('fs');
const path = require('path');

/**
 * Extract ABIs from compiled contracts for frontend use
 */

const contracts = [
    { name: 'Voting', source: 'Voting.sol' },
    { name: 'BALToken', source: 'BALToken.sol' },
    { name: 'CandidateNFT', source: 'CandidateNFT.sol' }
];

const artifactsDir = path.join(__dirname, '../artifacts/contracts');
const outputDir = path.join(__dirname, '../frontend/src/contracts');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🔧 Extracting ABIs...\n');

contracts.forEach(({ name, source }) => {
    const artifactPath = path.join(artifactsDir, source, `${name}.json`);
    const outputPath = path.join(outputDir, `${name}.json`);

    if (!fs.existsSync(artifactPath)) {
        console.log(`⚠️  ${name}: artifact not found (skipping)`);
        return;
    }

    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        const abiOnly = {
            abi: artifact.abi,
            bytecode: artifact.bytecode
        };

        fs.writeFileSync(outputPath, JSON.stringify(abiOnly, null, 2));
        console.log(`✅ ${name}: ABI extracted`);
    } catch (err) {
        console.error(`❌ ${name}: ${err.message}`);
    }
});

console.log(`\n📁 Output: ${outputDir}\n`);