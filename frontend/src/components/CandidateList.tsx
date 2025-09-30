import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useState } from 'react';
import { votingABI } from '../contracts';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: votingABI,
} as const;

export function CandidateList() {
    const { address } = useAccount();
    const [proofData, setProofData] = useState<`0x${string}`[] | null>(null);

    const { data: resultsData, refetch } = useReadContract({
        ...votingContract,
        functionName: 'getResults',
    });

    const { data: hasVoted, refetch: refetchVoted } = useReadContract({
        ...votingContract,
        functionName: 'hasVoted',
        args: address ? [address] : undefined,
    });

    const { writeContract, data: hash, isPending, isError: writeError, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    // Refetch data after successful vote
    if (isSuccess) {
        setTimeout(() => {
            refetch();
            refetchVoted();
        }, 2000);
    }

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const userProof = json[address?.toLowerCase() || ''];
                if (userProof && Array.isArray(userProof)) {
                    setProofData(userProof);
                    alert('✅ Proof loaded successfully!');
                } else {
                    alert('❌ No proof found for your address');
                }
            } catch {
                alert('❌ Invalid proof file format');
            }
        };
        reader.readAsText(file);
    };

    const handleVote = (candidateId: number) => {
        if (!proofData || !address) {
            alert('Please connect wallet and upload proof first');
            return;
        }

        writeContract({
            ...votingContract,
            functionName: 'vote',
            args: [BigInt(candidateId), proofData],
        });
    };

    if (!resultsData) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading candidates...</div>;
    }

    const [candidates, votes] = resultsData as [string[], bigint[]];
    const totalVotes = votes.reduce((sum, v) => sum + v, 0n);

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                Candidates ({candidates.length})
            </h2>

            {/* Proof Upload */}
            {address && !hasVoted && !proofData && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1.5rem',
                    border: '2px dashed #cbd5e0',
                    borderRadius: '12px',
                    backgroundColor: '#f7fafc'
                }}>
                    <h3 style={{ marginTop: 0 }}>📁 Upload Voting Proof</h3>
                    <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
                        Upload your proofs.json file to verify eligibility
                    </p>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleProofUpload}
                        style={{
                            padding: '0.5rem',
                            border: '1px solid #cbd5e0',
                            borderRadius: '6px',
                            width: '100%'
                        }}
                    />
                </div>
            )}

            {/* Status Messages */}
            {hasVoted && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#c6f6d5',
                    border: '1px solid #9ae6b4',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    color: '#22543d'
                }}>
                    ✅ You have already voted in this election
                </div>
            )}

            {isSuccess && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#c6f6d5',
                    border: '1px solid #9ae6b4',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    color: '#22543d'
                }}>
                    🎉 Vote confirmed! You received BAL tokens as a reward.
                </div>
            )}

            {writeError && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#fed7d7',
                    border: '1px solid #fc8181',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    color: '#742a2a'
                }}>
                    ❌ Error: {error?.message?.slice(0, 100) || 'Failed to submit vote'}
                </div>
            )}

            {/* Candidates Grid */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {candidates.map((name, index) => {
                    const voteCount = votes[index];
                    const percentage = totalVotes > 0n
                        ? Number((voteCount * 100n) / totalVotes)
                        : 0;

                    return (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                backgroundColor: 'white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                transition: 'box-shadow 0.2s'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'start',
                                marginBottom: '1rem'
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{name}</h3>
                                    <p style={{ margin: '0.25rem 0', color: '#718096', fontSize: '0.875rem' }}>
                                        Candidate #{index}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>
                                        {voteCount.toString()}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#718096' }}>votes</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div style={{
                                width: '100%',
                                height: '12px',
                                backgroundColor: '#edf2f7',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    backgroundColor: '#4299e1',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#718096' }}>
                                {percentage.toFixed(1)}%
                            </div>

                            {/* Vote Button */}
                            {address && !hasVoted && proofData && (
                                <button
                                    onClick={() => handleVote(index)}
                                    disabled={isPending || isConfirming}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem',
                                        marginTop: '1rem',
                                        backgroundColor: isPending || isConfirming ? '#cbd5e0' : '#4299e1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isPending && !isConfirming) {
                                            e.currentTarget.style.backgroundColor = '#3182ce';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isPending && !isConfirming) {
                                            e.currentTarget.style.backgroundColor = '#4299e1';
                                        }
                                    }}
                                >
                                    {isPending ? '⏳ Submitting Vote...' :
                                        isConfirming ? '⏳ Confirming Transaction...' :
                                            '🗳️ Vote for this Candidate'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {totalVotes > 0n && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#edf2f7',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '1.125rem',
                    fontWeight: '600'
                }}>
                    📊 Total Votes Cast: {totalVotes.toString()}
                </div>
            )}
        </div>
    );
}