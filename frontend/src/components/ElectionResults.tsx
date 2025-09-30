import { useReadContract } from 'wagmi';
import { votingABI } from '../contracts';
import { useState, useEffect } from 'react';

// Use the existing contract configuration
const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: votingABI,
} as const;

interface CandidateResult {
    name: string;
    votes: bigint;
    percentage: number;
}

export function ElectionResults() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // NOTE: Removed the explicit generic type. Wagmi/Viem infers the return type 
    // [string[], bigint[]] from the 'votingContract' object and 'functionName'.
    const { data: resultsData, isLoading, isError, error } = useReadContract({
        ...votingContract,
        functionName: 'getResults',
        // Poll for results update every 5 seconds
        query: {
            refetchInterval: 5000,
        }
    });

    let processedResults: CandidateResult[] = [];
    let totalVotes = 0n;
    let totalVotesNumber = 0;

    if (resultsData) {
        // The type is correctly inferred as [string[], bigint[]] here
        // The destructuring is now type-safe:
        const [candidates, votes] = resultsData as [string[], bigint[]];

        // Add a check to ensure we have candidate names and corresponding vote counts
        if (candidates.length > 0 && candidates.length === votes.length) {
            // Explicitly type 'sum' and 'current' as 'bigint' to fix TS error 7006
            totalVotes = votes.reduce((sum: bigint, current: bigint) => sum + current, 0n);
            totalVotesNumber = Number(totalVotes);

            // Process results
            // Explicitly type 'name' as 'string' and 'index' as 'number' to fix TS error 7006
            processedResults = candidates.map((name: string, index: number): CandidateResult => {
                const currentVotes = votes[index];
                const percentage = totalVotes > 0n
                    ? (Number(currentVotes) * 100) / totalVotesNumber
                    : 0;

                return {
                    name,
                    votes: currentVotes,
                    percentage: parseFloat(percentage.toFixed(2))
                };
            })
                // Explicitly type 'a' and 'b' as 'CandidateResult' to fix TS error 7006
                .sort((a: CandidateResult, b: CandidateResult) => b.votes > a.votes ? 1 : b.votes < a.votes ? -1 : 0);
        }
    }

    // --- Styles & Helpers ---
    const cardStyle: React.CSSProperties = {
        padding: isMobile ? '1rem' : '1.5rem',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(237, 242, 247, 0.95) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'slideIn 0.5s ease-out 0.2s both',
    };

    const loaderStyle: React.CSSProperties = {
        padding: '1rem',
        textAlign: 'center',
        color: '#4a5568'
    };

    // --- Rendering ---
    if (isLoading) {
        return (
            <div className='glass-card' style={{ ...cardStyle, ...loaderStyle }}>
                <span className='spinner' /> Fetching election results...
            </div>
        );
    }

    if (isError) {
        // This is the branch that executes due to the contract revert
        return (
            <div className='glass-card' style={{ ...cardStyle, padding: '1rem', color: '#e53e3e', fontWeight: '600' }}>
                ❌ Error fetching results. Check if candidates are initialized.
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: '0.8' }}>
                    Error details: {error?.message.substring(0, 100)}...
                </div>
            </div>
        );
    }

    return (
        <div className='glass-card' style={cardStyle}>
            <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                marginBottom: '1.5rem',
                fontWeight: '700',
                color: '#2d3748',
                borderBottom: '2px solid #667eea',
                paddingBottom: '0.5rem'
            }}>
                📊 Live Election Results
            </h2>

            {totalVotesNumber === 0 && processedResults.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#4a5568', fontWeight: '500' }}>
                    No candidates found or no votes cast yet.
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: '1.5rem', fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '700', color: '#4a5568' }}>
                        Total Votes Cast: {totalVotes.toString()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {processedResults.map((result, index) => (
                            <div key={index}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '0.5rem',
                                    fontSize: isMobile ? '0.875rem' : '1rem',
                                    fontWeight: '600',
                                    color: '#2d3748'
                                }}>
                                    <span>{result.name}</span>
                                    <span style={{ color: '#667eea' }}>
                                        {result.votes.toString()} Votes ({result.percentage}%)
                                    </span>
                                </div>

                                {/* Progress Bar Visualization */}
                                <div style={{
                                    height: '10px',
                                    backgroundColor: '#e2e8f0',
                                    borderRadius: '5px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${result.percentage}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                        transition: 'width 0.5s ease-out'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}