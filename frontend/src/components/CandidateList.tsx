import {
    useReadContract,
    useWriteContract,
    useAccount,
    useWaitForTransactionReceipt,
    useChainId,
    useSimulateContract,
} from 'wagmi';
import { useState, useEffect, useMemo } from 'react';
import { votingABI } from '../contracts';
import { ProofUpload } from './ProofUpload';
import { sepolia } from 'wagmi/chains';
import { BaseError } from 'viem';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`,
    abi: votingABI,
} as const;

export function CandidateList() {
    const { address } = useAccount();
    const chainId = useChainId();
    const [proofData, setProofData] = useState<`0x${string}`[] | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [voteMode, setVoteMode] = useState<'direct' | 'questionnaire'>('direct');
    const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
    const [economicPos, setEconomicPos] = useState(5);
    const [socialPos, setSocialPos] = useState(5);
    const [foreignPos, setForeignPos] = useState(5);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const r = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', r);
        return () => window.removeEventListener('resize', r);
    }, []);

    const { data: candidatesData, error: readError, isLoading: readLoading, refetch } = useReadContract({
        ...votingContract,
        functionName: 'getAllCandidates',
        query: { enabled: chainId === sepolia.id && !!votingContract.address },
    });

    const { data: hasVoted, refetch: refetchVoted } = useReadContract({
        ...votingContract,
        functionName: 'hasVoted',
        args: address ? [address] : undefined,
        query: { enabled: !!address && chainId === sepolia.id },
    });

    const names: string[] = useMemo(() => (candidatesData as [string[], number[][], bigint[]] | undefined)?.[0] ?? [], [candidatesData]);
    const positions = useMemo(() => (candidatesData as [string[], number[][], bigint[]] | undefined)?.[1] ?? [], [candidatesData]);
    const votes = useMemo(() => (candidatesData as [string[], number[][], bigint[]] | undefined)?.[2] ?? [], [candidatesData]);

    const simDirectEnabled = selectedCandidate !== null && !!proofData;
    const simQuestEnabled = !!proofData;

    const simDirectArgs = useMemo(
        () => (simDirectEnabled ? [BigInt(selectedCandidate as number), proofData as `0x${string}`[]] as const : undefined),
        [simDirectEnabled, selectedCandidate, proofData]
    );
    const simQuestArgs = useMemo(
        () => (simQuestEnabled ? [[economicPos, socialPos, foreignPos], proofData as `0x${string}`[]] as const : undefined),
        [simQuestEnabled, economicPos, socialPos, foreignPos, proofData]
    );

    const { data: simDirect, error: simDirectErr } = useSimulateContract({
        ...votingContract,
        functionName: 'vote',
        args: simDirectArgs,
        query: { enabled: simDirectEnabled },
    });

    const { data: simQuest, error: simQuestErr } = useSimulateContract({
        ...votingContract,
        functionName: 'voteByQuestionnaire',
        args: simQuestArgs,
        query: { enabled: simQuestEnabled },
    });

    const { data: hash, writeContract, isPending: isWalletOpen, error: writeErr } = useWriteContract();
    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed, isError: isReceiptError, error: receiptErr } =
        useWaitForTransactionReceipt({ hash, chainId: sepolia.id, confirmations: 1 });

    useEffect(() => {
        if (isConfirmed) {
            setSelectedCandidate(null);
            setProofData(null);
            setTimeout(() => {
                refetch();
                refetchVoted();
            }, 1500);
        }
    }, [isConfirmed, refetch, refetchVoted]);

    const formatErr = (e: unknown) => (e as BaseError)?.shortMessage ?? (e as Error)?.message ?? 'Unknown error';
    const errorText = formatErr(writeErr || receiptErr);

    const canSubmitDirect = !!address && !!proofData && selectedCandidate !== null && !isWalletOpen && !isConfirming && !simDirectErr;
    const canSubmitQuest = !!address && !!proofData && !isWalletOpen && !isConfirming && !simQuestErr;

    const handleDirectVote = async (candidateId: number) => {
        if (!proofData) return alert('Upload proof file first');
        if (simDirect?.request) return writeContract(simDirect.request);
        await writeContract({ ...votingContract, functionName: 'vote', args: [BigInt(candidateId), proofData] });
    };

    const handleQuestionnaireVote = async () => {
        if (!proofData) return alert('Upload proof file first');
        if (simQuest?.request) return writeContract(simQuest.request);
        await writeContract({ ...votingContract, functionName: 'voteByQuestionnaire', args: [[economicPos, socialPos, foreignPos], proofData] });
    };

    if (chainId !== sepolia.id) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.95)', borderRadius: '16px', color: '#e53e3e' }}>
                ⚠️ Wrong Network: Please switch to Sepolia in MetaMask
            </div>
        );
    }

    if (readError) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.95)', borderRadius: '16px', color: '#e53e3e' }}>
                <div>Error: {readError.message}</div>
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>Contract: {votingContract.address}</div>
            </div>
        );
    }

    if (readLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.95)', borderRadius: '16px' }}>
                <div>Loading candidates...</div>
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>Contract: {votingContract.address}</div>
            </div>
        );
    }

    if (!candidatesData) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.95)', borderRadius: '16px' }}>
                No data returned from contract. Check console for details.
            </div>
        );
    }

    if (names.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.95)', borderRadius: '16px' }}>
                No candidates have been added yet. Admin needs to set candidates first.
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Candidates & Voting
            </h2>

            {address && !hasVoted && !proofData && (
                <ProofUpload address={address} onProofLoaded={setProofData} />
            )}

            {hasVoted && (
                <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%)', borderRadius: '8px', marginBottom: '1rem', color: '#22543d', fontWeight: 600 }}>
                    You already voted
                </div>
            )}

            {!hasVoted && proofData && (
                <>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                        <button onClick={() => setVoteMode('direct')} style={{ flex: 1, padding: '12px', border: `2px solid ${voteMode === 'direct' ? '#667eea' : '#e0e0e0'}`, background: voteMode === 'direct' ? '#667eea' : 'white', color: voteMode === 'direct' ? 'white' : '#333', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                            Direct Vote
                        </button>
                        <button onClick={() => setVoteMode('questionnaire')} style={{ flex: 1, padding: '12px', border: `2px solid ${voteMode === 'questionnaire' ? '#667eea' : '#e0e0e0'}`, background: voteMode === 'questionnaire' ? '#667eea' : 'white', color: voteMode === 'questionnaire' ? 'white' : '#333', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                            Questionnaire
                        </button>
                    </div>

                    {voteMode === 'direct' ? (
                        <div>
                            <h3>Select Candidate</h3>
                            {names.map((name, i) => (
                                <div key={i} onClick={() => setSelectedCandidate(i)} style={{ padding: '1rem', margin: '10px 0', border: `2px solid ${selectedCandidate === i ? '#667eea' : '#e0e0e0'}`, borderRadius: '12px', cursor: 'pointer', background: selectedCandidate === i ? '#f0f4ff' : 'white' }}>
                                    <h4 style={{ margin: '0 0 8px 0' }}>{name}</h4>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <span style={{ background: '#667eea', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>Economic: {positions[i][0]}</span>
                                        <span style={{ background: '#667eea', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>Social: {positions[i][1]}</span>
                                        <span style={{ background: '#667eea', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>Foreign: {positions[i][2]}</span>
                                    </div>
                                    <p style={{ margin: '8px 0 0 0', color: '#666' }}>Votes: {votes[i].toString()}</p>
                                </div>
                            ))}

                            {/* Show sim error ONLY when enabled */}
                            {simDirectEnabled && simDirectErr && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fde8e8', color: '#9b2c2c', fontWeight: 700 }}>
                                    Would revert: {formatErr(simDirectErr)}
                                </div>
                            )}
                            {isWalletOpen && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fff3cd', color: '#7f5f00', fontWeight: 700 }}>
                                    Confirm in your wallet…
                                </div>
                            )}
                            {hash && !isConfirmed && !isReceiptError && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#e6f0ff', color: '#1e3a8a', fontWeight: 700 }}>
                                    Submitting… <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">View</a>
                                </div>
                            )}
                            {isConfirming && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#ede9fe', color: '#5b21b6', fontWeight: 700 }}>
                                    Confirming on chain…
                                </div>
                            )}
                            {isConfirmed && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#c6f6d5', color: '#22543d', fontWeight: 700 }}>
                                    Confirmed in block {receipt?.blockNumber?.toString()}
                                </div>
                            )}
                            {(isReceiptError || writeErr) && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fde8e8', color: '#9b2c2c', fontWeight: 700 }}>
                                    Transaction failed: {errorText}
                                </div>
                            )}

                            <button
                                onClick={() => selectedCandidate !== null && handleDirectVote(selectedCandidate)}
                                disabled={!canSubmitDirect}
                                style={{ width: '100%', padding: '15px', background: !canSubmitDirect ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, cursor: !canSubmitDirect ? 'not-allowed' : 'pointer', marginTop: '10px' }}
                            >
                                Submit Vote
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                Your answers match to the closest candidate automatically. You won't know who you voted for (anonymous).
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                                    Economic Policy
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                                        <span>Free Market (0)</span>
                                        <span>Gov Control (10)</span>
                                    </div>
                                </label>
                                <input type="range" min={0} max={10} value={economicPos} onChange={e => setEconomicPos(Number(e.target.value))} style={{ width: '100%' }} />
                                <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#667eea' }}>{economicPos}</div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                                    Social Policy
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                                        <span>Traditional (0)</span>
                                        <span>Progressive (10)</span>
                                    </div>
                                </label>
                                <input type="range" min={0} max={10} value={socialPos} onChange={e => setSocialPos(Number(e.target.value))} style={{ width: '100%' }} />
                                <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#667eea' }}>{socialPos}</div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                                    Foreign Policy
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                                        <span>Isolationist (0)</span>
                                        <span>Interventionist (10)</span>
                                    </div>
                                </label>
                                <input type="range" min={0} max={10} value={foreignPos} onChange={e => setForeignPos(Number(e.target.value))} style={{ width: '100%' }} />
                                <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#667eea' }}>{foreignPos}</div>
                            </div>

                            <div style={{ background: '#e7f3ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <strong>Your Positions:</strong> [{economicPos}, {socialPos}, {foreignPos}]
                            </div>

                            {simQuestEnabled && simQuestErr && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fde8e8', color: '#9b2c2c', fontWeight: 700 }}>
                                    Would revert: {formatErr(simQuestErr)}
                                </div>
                            )}
                            {isWalletOpen && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fff3cd', color: '#7f5f00', fontWeight: 700 }}>
                                    Confirm in your wallet…
                                </div>
                            )}
                            {hash && !isConfirmed && !isReceiptError && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#e6f0ff', color: '#1e3a8a', fontWeight: 700 }}>
                                    Submitting… <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">View</a>
                                </div>
                            )}
                            {isConfirming && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#ede9fe', color: '#5b21b6', fontWeight: 700 }}>
                                    Confirming on chain…
                                </div>
                            )}
                            {isConfirmed && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#c6f6d5', color: '#22543d', fontWeight: 700 }}>
                                    Confirmed in block {receipt?.blockNumber?.toString()}
                                </div>
                            )}
                            {(isReceiptError || writeErr) && (
                                <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fde8e8', color: '#9b2c2c', fontWeight: 700 }}>
                                    Transaction failed: {errorText}
                                </div>
                            )}

                            <button onClick={handleQuestionnaireVote} disabled={!canSubmitQuest} style={{ width: '100%', padding: '15px', background: !canSubmitQuest ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, cursor: !canSubmitQuest ? 'not-allowed' : 'pointer' }}>
                                Submit Anonymous Vote
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
