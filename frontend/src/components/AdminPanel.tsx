import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { votingABI } from '../contracts';

export function AdminPanel() {
    const { address } = useAccount();
    const [isMobile, setIsMobile] = useState(false);
    const [showPanel, setShowPanel] = useState(false);

    // Form states
    const [candidateName, setCandidateName] = useState('');
    const [merkleRoot, setMerkleRoot] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
    const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirming' | 'success' | 'error'>('idle');

    // Read existing candidates
    const { data: existingCandidates, refetch } = useReadContract({
        address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: votingABI,
        functionName: 'getCandidates',
    });

    // Sync txStatus with transaction states
    useEffect(() => {
        if (isPending) setTxStatus('pending');
        else if (isConfirming) setTxStatus('confirming');
        else if (isSuccess) {
            setTxStatus('success');
            refetch();
        }
        else if (error) setTxStatus('error');
        else setTxStatus('idle');
    }, [isPending, isConfirming, isSuccess, error, refetch]);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isAdmin = address?.toLowerCase() === import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();

    if (!isAdmin) return null;

    const handleAddCandidate = async () => {
        if (!candidateName.trim()) {
            alert('Please enter candidate name(s)');
            return;
        }

        const newCandidates = candidateName
            .split(',')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (newCandidates.length === 0) {
            alert('Please enter valid candidate name(s)');
            return;
        }

        const currentCandidates = (existingCandidates as string[]) || [];
        const updatedCandidates = [...currentCandidates, ...newCandidates];

        writeContractAsync({
            address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
            abi: votingABI,
            functionName: 'setCandidates',
            args: [updatedCandidates],
        });

        setCandidateName('');
    };

    const handleSetMerkleRoot = async () => {
        if (!merkleRoot.trim() || !merkleRoot.startsWith('0x')) {
            alert('Please enter a valid Merkle root (0x...)');
            return;
        }

        try {
            setTxStatus('pending');
            await writeContractAsync({
                address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
                abi: votingABI,
                functionName: 'setMerkleRoot',
                args: [merkleRoot as `0x${string}`],
            });
            setMerkleRoot('');
        } catch (error) {
            console.error('Transaction failed:', error);
            setTxStatus('error');
            alert('Transaction failed: ' + (error as Error).message);
        }
    };

    const handleSetTimeWindow = async () => {
        if (!startTime || !endTime) {
            alert('Please select both start and end times');
            return;
        }

        const start = Math.floor(new Date(startTime).getTime() / 1000);
        const end = Math.floor(new Date(endTime).getTime() / 1000);

        if (end <= start) {
            alert('End time must be after start time');
            return;
        }

        try {
            setTxStatus('pending');
            await writeContractAsync({
                address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
                abi: votingABI,
                functionName: 'setWindow',
                args: [BigInt(start), BigInt(end)],
            });
            setStartTime('');
            setEndTime('');
        } catch (error) {
            console.error('Transaction failed:', error);
            setTxStatus('error');
            alert('Transaction failed: ' + (error as Error).message);
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                style={{
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
            >
                🔧 Admin Controls
            </button>

            {/* Overlay Panel */}
            {showPanel && (
                <div
                    onClick={() => setShowPanel(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 1000,
                        backdropFilter: 'blur(2px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem 0'
                    }}
                >
                    {/* Panel */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: isMobile ? '90%' : '500px',
                            maxHeight: '85vh',
                            overflowY: 'auto',
                            padding: isMobile ? '1.25rem' : '1.5rem',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            border: '2px solid rgba(237, 137, 54, 0.5)',
                            position: 'relative',
                            margin: 'auto'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.25rem'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#c05621'
                            }}>
                                🔧 Admin Controls
                            </h3>
                            <button
                                onClick={() => setShowPanel(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: '#ed8936',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕ Close
                            </button>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem'
                        }}>
                            {/* Transaction Status */}
                            {txStatus !== 'idle' && (
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    background: txStatus === 'success' ? '#c6f6d5' : txStatus === 'error' ? '#fed7d7' : '#feebc8',
                                    border: `2px solid ${txStatus === 'success' ? '#48bb78' : txStatus === 'error' ? '#fc8181' : '#ed8936'}`,
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: txStatus === 'success' ? '#22543d' : txStatus === 'error' ? '#742a2a' : '#7c2d12'
                                }}>
                                    {txStatus === 'pending' && 'Waiting for wallet confirmation...'}
                                    {txStatus === 'confirming' && 'Transaction processing...'}
                                    {txStatus === 'success' && 'Transaction confirmed!'}
                                    {txStatus === 'error' && 'Transaction failed.'}
                                </div>
                            )}

                            {/* Add Candidate */}
                            <div style={{
                                padding: '1rem',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '2px solid #e2e8f0'
                            }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    color: '#2d3748'
                                }}>
                                    Add Candidate(s)
                                </label>
                                <input
                                    type="text"
                                    value={candidateName}
                                    onChange={(e) => setCandidateName(e.target.value)}
                                    placeholder="Alice, Bob, Charlie"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem',
                                        border: '2px solid #cbd5e0',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    onClick={handleAddCandidate}
                                    disabled={txStatus !== 'idle'}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        cursor: txStatus !== 'idle' ? 'not-allowed' : 'pointer',
                                        opacity: txStatus !== 'idle' ? 0.6 : 1
                                    }}
                                >
                                    {txStatus !== 'idle' ? 'Processing...' : 'Add Candidate'}
                                </button>
                            </div>

                            {/* Set Merkle Root */}
                            <div style={{
                                padding: '1rem',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '2px solid #e2e8f0'
                            }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    color: '#2d3748'
                                }}>
                                    Set Merkle Root
                                </label>
                                <input
                                    type="text"
                                    value={merkleRoot}
                                    onChange={(e) => setMerkleRoot(e.target.value)}
                                    placeholder="0x..."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem',
                                        border: '2px solid #cbd5e0',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    onClick={handleSetMerkleRoot}
                                    disabled={isPending || isConfirming}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
                                        opacity: isPending || isConfirming ? 0.6 : 1
                                    }}
                                >
                                    {isPending || isConfirming ? 'Processing...' : 'Set Voter Root'}
                                </button>
                            </div>

                            {/* Set Time Window */}
                            <div style={{
                                padding: '1rem',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '2px solid #e2e8f0'
                            }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    color: '#2d3748'
                                }}>
                                    Set Voting Window
                                </label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem',
                                        border: '2px solid #cbd5e0',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem',
                                        border: '2px solid #cbd5e0',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    onClick={handleSetTimeWindow}
                                    disabled={isPending || isConfirming}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
                                        opacity: isPending || isConfirming ? 0.6 : 1
                                    }}
                                >
                                    {isPending || isConfirming ? 'Processing...' : 'Set Window'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}