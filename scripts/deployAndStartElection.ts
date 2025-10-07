// scripts/deployAndStartElection.ts
import 'dotenv/config'
import { ethers } from 'hardhat'
import { getAddress } from 'ethers'
import fs from 'node:fs/promises'
import path from 'node:path'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

async function writeJson(file: string, data: unknown) {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify(data, null, 2))
}

function parseAddresses(src?: string) {
    if (!src) throw new Error('VOTER_ADDRESSES is required (comma/space separated addresses)')
    const list = src
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(a => getAddress(a))
    if (list.length === 0) throw new Error('VOTER_ADDRESSES is empty')
    return Array.from(new Set(list))
}

async function copyABIsToFrontend() {
    const pairs = [
        ['artifacts/contracts/Voting.sol/Voting.json', 'frontend/src/contracts/Voting.json'],
        ['artifacts/contracts/BALToken.sol/BALToken.json', 'frontend/src/contracts/BALToken.json'],
        ['artifacts/contracts/CandidateNFT.sol/CandidateNFT.json', 'frontend/src/contracts/CandidateNFT.json'],
    ]
    for (const [src, dst] of pairs) {
        const absSrc = path.resolve(src)
        const absDst = path.resolve(dst)
        await fs.mkdir(path.dirname(absDst), { recursive: true })
        await fs.copyFile(absSrc, absDst)
    }
}

async function main() {
    const voters = parseAddresses(process.env.VOTER_ADDRESSES)
    const values: [string][] = voters.map(v => [v])
    const tree = StandardMerkleTree.of(values, ['address'])
    const root = tree.root as `0x${string}`

    const proofs: Record<string, string[]> = {}
    for (const [i, v] of tree.entries()) {
        const addr = getAddress((v as [string])[0])
        proofs[addr] = tree.getProof(i)
    }

    const outDir = path.resolve('data/proofs')
    await writeJson(path.join(outDir, 'tree.json'), tree.dump())
    await writeJson(path.join(outDir, 'proofs.json'), { root, proofs })

    const Voting = await ethers.getContractFactory('Voting')

    let voting: any
    try {
        voting = await Voting.deploy()
    } catch {
        const [deployer] = await ethers.getSigners()
        voting = await Voting.deploy(await deployer.getAddress())
    }
    await voting.deploymentTransaction()?.wait()
    const votingAddr: `0x${string}` = await voting.getAddress()

    const names =
        process.env.CANDIDATE_NAMES?.split(',').map(s => s.trim()).filter(Boolean) ??
        ['Alice', 'Bob', 'Charlie']

    const positions: [number, number, number][] = process.env.CANDIDATE_POSITIONS_JSON
        ? (JSON.parse(process.env.CANDIDATE_POSITIONS_JSON) as [number, number, number][])
        : [
            [4, 6, 5],
            [6, 4, 5],
            [5, 5, 6],
        ]

    if (names.length === 0) throw new Error('No candidate names provided')
    if (positions.length !== names.length) throw new Error('CANDIDATE_POSITIONS_JSON length must match CANDIDATE_NAMES')

    const now = Math.floor(Date.now() / 1000)
    const start = Number(process.env.ELECTION_START_TS || now + Number(process.env.ELECTION_START_OFFSET_SEC ?? 60))
    const end =
        Number(process.env.ELECTION_END_TS) ||
        start + Number(process.env.ELECTION_DURATION_SEC ?? 30 * 24 * 60 * 60)

    const tx = await voting.startNewElection(start, end, names, positions, root)
    await tx.wait()

    const envLines = [
        `VOTING_ADDR_SEPOLIA=${votingAddr}`,
        `VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA=${votingAddr}`,
        `VOTER_MERKLE_ROOT=${root}`,
    ].join('\n')
    console.log('\n' + envLines + '\n')

    await copyABIsToFrontend()
    console.log('ABIs copied to frontend/src/contracts')

    console.log('\nArtifacts written:')
    console.log(` - ${path.join(outDir, 'tree.json')}`)
    console.log(` - ${path.join(outDir, 'proofs.json')}`)
    console.log('\nFrontend: restart dev server, upload data/proofs/proofs.json, then vote.')
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
