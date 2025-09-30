import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { votingABI } from '../contracts';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: votingABI,
} as const;

export function CandidateList() {
    const { address } = useAccount();
    const [proofData, setProofData] = useState<`0x${string}`[] | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '16px'
            }}>
                <div className="spinner"></div> Loading candidates...
            </div>
        );
    }

    const [candidates, votes] = resultsData as [string[], bigint[]];
    const totalVotes = votes.reduce((sum, v) => sum + v, 0n);

    return (
        <div style={{
            padding: isMobile ? '1rem' : '1.5rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            animation: 'slideIn 0.5s ease-out 0.2s both'
        }}>
            <h2 style={{
                marginBottom: '1.5rem',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
            }}>
                Candidates ({candidates.length})
            </h2>

            {address && !hasVoted && !proofData && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: isMobile ? '1rem' : '1.5rem',
                    border: '2px dashed #cbd5e0',
                    borderRadius: '12px',
                    backgroundColor: '#f7fafc'
                }}>
                    <h3 style={{ marginTop: 0, fontSize: isMobile ? '1rem' : '1.125rem' }}>
                        📄 Upload Voting Proof
                    </h3>
                    <p style={{
                        color: '#4a5568',
                        marginBottom: '1rem',
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}>
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
                            width: '100%',
                            fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                    />
                </div>
            )}

            {hasVoted && (
                <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    color: '#22543d',
                    fontWeight: '600',
                    fontSize: isMobile ? '0.875rem' : '1rem'
                }}>
                    ✅ You have already voted
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: isMobile ? '1rem' : '1.5rem'
            }}>
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
                                padding: isMobile ? '1rem' : '1.5rem',
                                backgroundColor: 'white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'start',
                                marginBottom: '1rem'
                            }}>
                                <div>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: isMobile ? '1rem' : '1.25rem'
                                    }}>
                                        {name}
                                    </h3>
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '0.25rem',
                                        padding: '0.125rem 0.5rem',
                                        backgroundColor: '#edf2f7',
                                        color: '#4a5568',
                                        borderRadius: '4px',
                                        fontSize: isMobile ? '0.625rem' : '0.75rem'
                                    }}>
                                        ID: {index}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontSize: isMobile ? '1.5rem' : '2rem',
                                        fontWeight: 'bold',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}>
                                        {voteCount.toString()}
                                    </div>
                                    <div style={{
                                        fontSize: isMobile ? '0.625rem' : '0.75rem',
                                        color: '#718096'
                                    }}>
                                        votes
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: '#edf2f7',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                            <div style={{
                                textAlign: 'right',
                                fontSize: isMobile ? '0.625rem' : '0.75rem',
                                color: '#718096'
                            }}>
                                {percentage.toFixed(1)}%
                            </div>

                            {address && !hasVoted && proofData && (
                                <button
                                    onClick={() => handleVote(index)}
                                    disabled={isPending || isConfirming}
                                    style={{
                                        width: '100%',
                                        padding: isMobile ? '0.625rem' : '0.875rem',
                                        marginTop: '1rem',
                                        background: isPending || isConfirming
                                            ? '#cbd5e0'
                                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
                                        fontSize: isMobile ? '0.875rem' : '1rem',
                                        fontWeight: '600',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {isPending ? '⏳ Submitting...' :
                                        isConfirming ? '⏳ Confirming...' :
                                            '🗳️ Vote'}
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
                    background: 'linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: isMobile ? '1rem' : '1.125rem',
                    fontWeight: '600'
                }}>
                    📊 Total Votes: {totalVotes.toString()}
                </div>
            )}
        </div>
    );
}