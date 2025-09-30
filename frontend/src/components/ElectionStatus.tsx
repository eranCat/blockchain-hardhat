import { useReadContract } from 'wagmi';
import { votingABI } from '../contracts';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: votingABI,
} as const;

export function ElectionStatus() {
    const { data: windowData, isLoading, isError } = useReadContract({
        ...votingContract,
        functionName: 'getWindow',
    });

    if (isLoading) {
        return (
            <div style={{
                padding: '1.5rem',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                Loading election status...
            </div>
        );
    }

    if (isError || !windowData) {
        return (
            <div style={{
                padding: '1.5rem',
                backgroundColor: '#fed7d7',
                border: '1px solid #fc8181',
                borderRadius: '12px',
                color: '#c53030'
            }}>
                ⚠️ Error loading election status. Please check your connection.
            </div>
        );
    }

    const [startTime, endTime] = windowData as [bigint, bigint];

    if (startTime === 0n && endTime === 0n) {
        return (
            <div style={{
                padding: '1.5rem',
                backgroundColor: '#feebc8',
                border: '1px solid #f6ad55',
                borderRadius: '12px',
                color: '#c05621'
            }}>
                ⏳ Election window has not been set yet
            </div>
        );
    }

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
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    };

    return (
        <div style={{
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `2px solid ${statusColor}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: statusBg,
                    color: statusColor,
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '1.125rem'
                }}>
                    {status === 'pending' && '⏳ Starting Soon'}
                    {status === 'active' && '✅ Voting Open'}
                    {status === 'ended' && '🏁 Election Ended'}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem', color: '#4a5568' }}>
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
                        borderRadius: '6px',
                        color: '#2c5282',
                        fontWeight: '600'
                    }}>
                        🗳️ Voting is currently open! Cast your vote now.
                    </div>
                )}
            </div>
        </div>
    );
}