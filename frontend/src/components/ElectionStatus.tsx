import { useEffect, useMemo, useState } from 'react';
import { useReadContract } from 'wagmi';
import { votingABI } from '../contracts';

const VOTING_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`;

export function ElectionStatus() {
    // Read directly from public vars
    const { data: startTs, isLoading: loadStart, isError: errStart } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'votingStart',
    });

    const { data: endTs, isLoading: loadEnd, isError: errEnd } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'votingEnd',
    });

    // compute isActive manually
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

    const start = useMemo(() => (startTs ? Number(startTs) * 1000 : null), [startTs]);
    const end = useMemo(() => (endTs ? Number(endTs) * 1000 : null), [endTs]);
    const activeFlag =
        start !== null && end !== null && now >= start && now <= end;

    const isLoading = loadStart || loadEnd;
    const isError = errStart || errEnd || start === null || end === null;

    // Status
    type Status = 'pending' | 'active' | 'ended';
    const status: Status = useMemo(() => {
        if (activeFlag) return 'active';
        if (start !== null && now < start) return 'pending';
        if (end !== null && now > end) return 'ended';
        return 'pending';
    }, [activeFlag, start, end, now]);

    const { statusColor, statusBg } = useMemo(() => {
        switch (status) {
            case 'pending': return { statusColor: '#d69e2e', statusBg: '#fefcbf' };
            case 'active': return { statusColor: '#38a169', statusBg: '#c6f6d5' };
            case 'ended':
            default: return { statusColor: '#718096', statusBg: '#e2e8f0' };
        }
    }, [status]);

    const cardStyle: React.CSSProperties = {
        padding: window.innerWidth < 768 ? '1rem' : '1.5rem',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
    };

    const formatDate = (ms: number) =>
        new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (isLoading) {
        return (
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid rgba(0,0,0,.15)', borderTopColor: 'rgba(0,0,0,.6)',
                        animation: 'spin .9s linear infinite',
                    }} />
                    Loading election status...
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (isError) {
        return (
            <div style={{
                ...cardStyle,
                backgroundColor: '#fed7d7',
                border: '2px solid #fc8181',
                color: '#c53030',
            }}>
                Error loading election status
            </div>
        );
    }

    return (
        <div style={{ ...cardStyle, border: `2px solid ${statusColor}`, backgroundColor: statusBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: statusColor }} />
                <div style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: statusBg,
                    color: statusColor,
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: window.innerWidth < 768 ? '0.875rem' : '1rem',
                }}>
                    {status === 'pending' && 'Starting Soon'}
                    {status === 'active' && 'Voting Open'}
                    {status === 'ended' && 'Election Ended'}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem', fontSize: window.innerWidth < 768 ? '0.75rem' : '0.875rem', color: '#4a5568' }}>
                <div><strong>Start:</strong> {formatDate(start!)}</div>
                <div><strong>End:</strong> {formatDate(end!)}</div>
                {status === 'active' && (
                    <div style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        backgroundColor: '#bee3f8',
                        borderRadius: '8px',
                        color: '#2c5282',
                        fontWeight: 600,
                        fontSize: window.innerWidth < 768 ? '0.75rem' : '0.875rem',
                    }}>
                        Cast your vote now!
                    </div>
                )}
            </div>
        </div>
    );
}