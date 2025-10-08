// frontend/src/components/VotingPanel.tsx
import {
    useAccount,
    useReadContract,
    useReadContracts,
    useSimulateContract,
    useWaitForTransactionReceipt,
    useWatchContractEvent,
    useWriteContract,
} from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { BaseError, decodeErrorResult, type Hex } from 'viem';
import { useEffect, useMemo, useState } from 'react';
import { votingABI } from '../contracts';
import { ProofUpload } from './ProofUpload';

const VOTING_ADDRESS = import.meta.env
    .VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`;

export function VotingPanel({ isMobile = false }: { isMobile?: boolean }) {
    const { address } = useAccount();

    const [proofData, setProofData] = useState<Hex[] | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
    const [uploadedRoot, setUploadedRoot] = useState<string | null>(null);
    const [votedName, setVotedName] = useState<string | null>(null);

    // ---------------- reads ----------------
    const { data: candidatesData } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'getAllCandidates',
        query: { refetchInterval: 15_000 },
    });

    const { data: hasVoted, refetch: refetchHasVoted } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'hasVoted',
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 8_000 },
    });

    const { data: onChainRoot } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'voterRoot',
    });

    // Try getVotingWindow() + isActive first (newer contracts) …
    const winActive = useReadContracts({
        contracts: [
            { address: VOTING_ADDRESS, abi: votingABI, functionName: 'getVotingWindow' as const }, // (uint64,uint64)
            { address: VOTING_ADDRESS, abi: votingABI, functionName: 'isActive' as const },
        ],
        query: { refetchInterval: 10_000 },
    });

    // …and fallback to legacy fields (older contracts)
    const legacyStart = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'startTime',
        query: { refetchInterval: 10_000 },
    });
    const legacyEnd = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'endTime',
        query: { refetchInterval: 10_000 },
    });
    const legacyActive = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'isActive',
        query: { refetchInterval: 10_000 },
    });

    // Prefer new helper if available; otherwise use legacy reads
    const winOk = !!winActive.data?.[0]?.result && !winActive.error;
    const startTs = (winOk
        ? (winActive.data?.[0]?.result as [bigint, bigint])[0]
        : (legacyStart.data as bigint | undefined)) ?? undefined;

    const endTs = (winOk
        ? (winActive.data?.[0]?.result as [bigint, bigint])[1]
        : (legacyEnd.data as bigint | undefined)) ?? undefined;

    const isActive = (winOk
        ? (winActive.data?.[1]?.result as boolean | undefined)
        : (legacyActive.data as boolean | undefined)) ?? false;

    const anyWindowErr =
        (!winOk && (legacyStart.error || legacyEnd.error)) || winActive.error;

    // ---------------- derived ----------------
    const electionStorageKey = useMemo(
        () => `lastVote:${VOTING_ADDRESS}:${endTs ? Number(endTs) : 'unknown'}`,
        [endTs]
    );

    useEffect(() => {
        if (hasVoted) {
            const saved = localStorage.getItem(electionStorageKey);
            if (saved) setVotedName(saved);
        } else {
            setVotedName(null);
        }
    }, [hasVoted, electionStorageKey]);

    useWatchContractEvent({
        address: VOTING_ADDRESS,
        abi: votingABI,
        eventName: 'Voted',
        onLogs: logs => {
            if (!address) return;
            const mine = logs.some(l => (l as any).args?.voter?.toLowerCase?.() === address.toLowerCase());
            if (mine) refetchHasVoted();
        },
    });

    const names: string[] = useMemo(() => {
        const res = candidatesData as [string[], number[][], bigint[]] | undefined;
        return res?.[0] ?? [];
    }, [candidatesData]);

    const rootMismatch = !!uploadedRoot && !!onChainRoot && uploadedRoot !== onChainRoot;

    // ---------------- simulate ----------------
    const simEnabled =
        selectedCandidate !== null &&
        !!proofData &&
        !rootMismatch &&
        !hasVoted &&
        !!isActive;

    const { data: sim, error: simError } = useSimulateContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'vote',
        args: simEnabled ? [BigInt(selectedCandidate as number), proofData as Hex[]] : undefined,
        query: { enabled: simEnabled },
    });

    // ---------------- write ----------------
    const { writeContract, data: hash, isPending: isWalletOpen, error: writeErr } = useWriteContract();
    const {
        data: receipt,
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        isError: isReceiptError,
        error: receiptErr,
    } = useWaitForTransactionReceipt({ hash, chainId: sepolia.id, confirmations: 1 });

    useEffect(() => {
        if (isConfirmed) {
            const name = selectedCandidate !== null ? names[selectedCandidate] : null;
            if (name) {
                localStorage.setItem(electionStorageKey, name);
                setVotedName(name);
            }
            setSelectedCandidate(null);
            setProofData(null);
            setUploadedRoot(null);
            refetchHasVoted();
        }
    }, [isConfirmed, names, selectedCandidate, electionStorageKey, refetchHasVoted]);

    // ---------------- error decode (Hex-safe) ----------------
    const extractRevert = (err: unknown) => {
        const e = err as BaseError & { cause?: any };
        const raw =
            e?.cause?.data?.data ??
            e?.cause?.data ??
            (typeof (e as any).data === 'string' ? (e as any).data : undefined);

        const hex: Hex | null =
            typeof raw === 'string' && raw.startsWith('0x') ? (raw as Hex) : null;

        if (hex) {
            try {
                const decoded = decodeErrorResult({ abi: votingABI, data: hex });
                return decoded.errorName || e.shortMessage || e.message;
            } catch { /* ignore */ }
        }
        return e?.shortMessage || e?.message || 'Unknown error';
    };

    const txErrorText =
        (simError && extractRevert(simError)) ||
        (writeErr && extractRevert(writeErr)) ||
        (receiptErr && extractRevert(receiptErr)) ||
        '';

    // ---------------- gating ----------------
    const nowSec = Math.floor(Date.now() / 1000);
    const s = startTs ? Number(startTs) : undefined;
    const e = endTs ? Number(endTs) : undefined;

    const notActiveReason = isActive
        ? ''
        : s && nowSec < s
            ? 'Election has not started yet.'
            : e && nowSec > e
                ? 'Election has ended.'
                : 'Election is not active.';

    const canSubmit =
        !!address &&
        !!proofData &&
        selectedCandidate !== null &&
        !rootMismatch &&
        !isWalletOpen &&
        !isConfirming &&
        !simError &&
        !hasVoted &&
        !!isActive;

    const handleVote = async () => {
        if (!address || selectedCandidate === null || !proofData || rootMismatch || hasVoted || !isActive) return;
        if (sim?.request) return writeContract(sim.request);
        await writeContract({
            address: VOTING_ADDRESS,
            abi: votingABI,
            functionName: 'vote',
            args: [BigInt(selectedCandidate), proofData as Hex[]],
        });
    };

    if (!address) {
        return (
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.95)', borderRadius: 16, textAlign: 'center', color: '#718096' }}>
                Connect wallet to vote
            </div>
        );
    }

    if (hasVoted) {
        return (
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg,#c6f6d5,#9ae6b4)', borderRadius: 16, textAlign: 'center', color: '#22543d', fontWeight: 700 }}>
                {votedName ? `You voted to ${votedName}` : 'You have already voted'}
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', background: 'rgba(255,255,255,0.95)', borderRadius: 16, border: '2px solid #667eea' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: isMobile ? 20 : 24, fontWeight: 700, background: 'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Cast Your Vote
            </h2>

            {anyWindowErr && (
                <div style={{ padding: 12, background: '#fde8e8', color: '#9b2c2c', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
                    Error loading election status: {(anyWindowErr as Error).message}
                </div>
            )}

            {!isActive && (
                <div style={{ padding: 12, background: '#fff3cd', color: '#7f5f00', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
                    {notActiveReason}
                    {s ? ` Starts: ${new Date(s * 1000).toLocaleString()}` : ''}{' '}
                    {e ? ` Ends: ${new Date(e * 1000).toLocaleString()}` : ''}
                </div>
            )}

            {!proofData ? (
                <ProofUpload address={address} onProofLoaded={setProofData} onRoot={setUploadedRoot} />
            ) : (
                <>
                    <div style={{ padding: 12, background: '#e6fffa', color: '#234e52', borderRadius: 8, marginBottom: 12 }}>
                        Proof loaded – select a candidate
                    </div>

                    {rootMismatch && (
                        <div style={{ padding: 12, background: '#fde8e8', color: '#9b2c2c', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
                            Uploaded root does not match on-chain root.
                        </div>
                    )}

                    {(simError || writeErr || isReceiptError) && !rootMismatch && (
                        <div style={{ padding: 12, background: '#fde8e8', color: '#9b2c2c', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
                            {txErrorText || 'The contract function "vote" reverted.'}
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                        {names.map((candidate, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedCandidate(index)}
                                style={{
                                    padding: isMobile ? '1rem' : '1.25rem',
                                    border: selectedCandidate === index ? '3px solid #667eea' : '2px solid #e2e8f0',
                                    borderRadius: 12,
                                    background: selectedCandidate === index ? '#edf2f7' : '#fff',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            border: selectedCandidate === index ? '2px solid #667eea' : '2px solid #cbd5e0',
                                            background: selectedCandidate === index ? '#667eea' : 'transparent',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                        }}
                                    >
                                        {selectedCandidate === index ? '✓' : ''}
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{candidate}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {isWalletOpen && (
                        <div style={{ padding: 12, background: '#fff3cd', color: '#7f5f00', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
                            Confirm in your wallet…
                        </div>
                    )}
                    {hash && !isConfirmed && !isReceiptError && (
                        <div style={{ padding: 12, background: '#e6f0ff', color: '#1e3a8a', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
                            Submitting…{' '}
                            <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">
                                View on Etherscan
                            </a>
                        </div>
                    )}
                    {isConfirming && (
                        <div style={{ padding: 12, background: '#ede9fe', color: '#5b21b6', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
                            Confirming on chain…
                        </div>
                    )}
                    {isConfirmed && (
                        <div style={{ padding: 12, background: '#c6f6d5', color: '#22543d', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
                            Confirmed in block {receipt?.blockNumber?.toString()}
                        </div>
                    )}

                    <button
                        onClick={handleVote}
                        disabled={!canSubmit}
                        style={{
                            width: '100%',
                            padding: isMobile ? '0.75rem' : '1rem',
                            background: !canSubmit ? '#cbd5e0' : '#667eea',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: isMobile ? 16 : 18,
                            cursor: !canSubmit ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isWalletOpen || isConfirming ? 'Submitting…' : 'Submit Vote'}
                    </button>
                </>
            )}
        </div>
    );
}
