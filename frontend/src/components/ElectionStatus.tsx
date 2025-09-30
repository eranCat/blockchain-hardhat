import { useReadContract } from 'wagmi';
import { votingABI } from '../contracts';
import { useState, useEffect } from 'react';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: votingABI,
} as const;

export function ElectionStatus() {
    const [isMobile, setIsMobile] = useState(false);
    const { data: windowData, isLoading, isError, refetch } = useReadContract({
        ...votingContract,
        functionName: 'getWindow',
    });

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-refetch every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 10000);
        return () => clearInterval(interval);
    }, [refetch]);

    const cardStyle = {
        padding: isMobile ? '1rem' : '1.5rem',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'slideIn 0.5s ease-out'
    };

    if (isLoading) {
        return (
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner"></div>
                    Loading election status...
                </div>
            </div>
        );
    }

    if (isError || !windowData) {
        return (
            <div style={{
                ...cardStyle,
                backgroundColor: '#fed7d7',
                border: '2px solid #fc8181',
                color: '#c53030'
            }}>
                ⚠️ Error loading election status
            </div>
        );
    }

    const [startTime, endTime] = windowData as [bigint, bigint];
    const now = Math.floor(Date.now() / 1000);
    const start = Number(startTime);
    const end = Number(endTime);

    let status: 'pending' | 'active' | 'ended';
    let statusColor: string;
    let statusBg: string;

    if (now < start) {
        status = 'pending';
        statusColor = '#d69e2e';
        statusBg = '#fefcbf';
    } else if (now >= start && now <= end) {
        status = 'active';
        statusColor = '#38a169';
        statusBg = '#c6f6d5';
    } else {
        status = 'ended';
        statusColor = '#718096';
        statusBg = '#e2e8f0';
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div style={{
            ...cardStyle,
            border: `2px solid ${statusColor}`
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
            }}>
                <div className="pulse" style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: statusColor
                }}></div>
                <div style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: statusBg,
                    color: statusColor,
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: isMobile ? '0.875rem' : '1rem'
                }}>
                    {status === 'pending' && '⏳ Starting Soon'}
                    {status === 'active' && '✅ Voting Open'}
                    {status === 'ended' && '🏁 Election Ended'}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gap: '0.75rem',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                color: '#4a5568'
            }}>
                <div>
                    <strong>Start:</strong> {formatDate(start)}
                </div>
                <div>
                    <strong>End:</strong> {formatDate(end)}
                </div>
                {status === 'active' && (
                    <div style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        backgroundColor: '#bee3f8',
                        borderRadius: '8px',
                        color: '#2c5282',
                        fontWeight: '600',
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}>
                        🗳️ Cast your vote now!
                    </div>
                )}
            </div>
        </div>
    );
}