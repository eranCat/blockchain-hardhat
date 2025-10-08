// frontend/src/components/ElectionStatus.tsx
import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { votingABI } from '../contracts';

const VOTING_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`;

export function ElectionStatus() {
    // Prefer new helper (getVotingWindow), fall back to startTime/endTime:
    const winActive = useReadContracts({
        contracts: [
            { address: VOTING_ADDRESS, abi: votingABI, functionName: 'getVotingWindow' as const }, // (uint64,uint64)
            { address: VOTING_ADDRESS, abi: votingABI, functionName: 'isActive' as const },
        ],
        query: { refetchInterval: 10_000 },
    });

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

    const usingHelper = !!winActive.data?.[0]?.result && !winActive.error;

    const startTs = usingHelper
        ? (winActive.data?.[0]?.result as [bigint, bigint])[0]
        : (legacyStart.data as bigint | undefined);

    const endTs = usingHelper
        ? (winActive.data?.[0]?.result as [bigint, bigint])[1]
        : (legacyEnd.data as bigint | undefined);

    const isActive =
        (usingHelper
            ? (winActive.data?.[1]?.result as boolean | undefined)
            : (legacyStart.isFetched && legacyEnd.isFetched
                ? (() => {
                    const now = BigInt(Math.floor(Date.now() / 1000));
                    return !!startTs && !!endTs && now >= startTs! && now <= endTs!;
                })()
                : undefined)) ?? false;

    const isLoading =
        winActive.isLoading ||
        (!usingHelper && (legacyStart.isLoading || legacyEnd.isLoading));

    const isError =
        winActive.error ||
        (!usingHelper && (legacyStart.error || legacyEnd.error)) ||
        !startTs ||
        !endTs;

    const s = startTs ? Number(startTs) * 1000 : undefined;
    const e = endTs ? Number(endTs) * 1000 : undefined;

    const status: 'pending' | 'active' | 'ended' = useMemo(() => {
        if (!s || !e) return 'pending';
        if (isActive) return 'active';
        const now = Date.now();
        if (now < s) return 'pending';
        if (now > e) return 'ended';
        return 'pending';
    }, [s, e, isActive]);

    const color =
        status === 'active' ? '#38a169' : status === 'pending' ? '#d69e2e' : '#718096';
    const bg =
        status === 'active' ? '#c6f6d5' : status === 'pending' ? '#fefcbf' : '#e2e8f0';

    const cardStyle: React.CSSProperties = {
        padding: '1rem',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        border: `2px solid ${color}`,
    };

    if (isLoading) return <div style={cardStyle}>Loading election status…</div>;
    if (isError) return <div style={{ ...cardStyle, borderColor: '#fc8181', background: '#fed7d7', color: '#c53030' }}>Error loading election status</div>;

    const fmt = (ms: number) => new Date(ms).toLocaleString();

    return (
        <div style={{ ...cardStyle, background: bg }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
                {status === 'active' ? 'Voting Open' : status === 'pending' ? 'Starting Soon' : 'Election Ended'}
            </div>
            <div><strong>Start:</strong> {s ? fmt(s) : '-'}</div>
            <div><strong>End:</strong> {e ? fmt(e) : '-'}</div>
        </div>
    );
}