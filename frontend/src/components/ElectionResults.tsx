import { useMemo } from 'react'
import { useReadContract, useWatchContractEvent } from 'wagmi'
import { votingABI } from '../contracts'

const VOTING_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`

type AllCandidates = [string[], number[][], bigint[]]

export function ElectionResults() {
    const {
        data: all,
        refetch: refetchAll,
    } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'getAllCandidates',
        // light polling in case events are missed
        query: { refetchInterval: 15000 },
    })

    const { data: endTs } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'votingEnd',
        query: { refetchInterval: 60000 },
    })

    useWatchContractEvent({
        address: VOTING_ADDRESS,
        abi: votingABI,
        eventName: 'Voted',
        onLogs: () => refetchAll(),
    })
    useWatchContractEvent({
        address: VOTING_ADDRESS,
        abi: votingABI,
        eventName: 'CandidatesSet',
        onLogs: () => refetchAll(),
    })

    const ended = useMemo(() => (endTs ? Date.now() > Number(endTs) * 1000 : false), [endTs])

    const { names, votes, winnerIndex, total } = useMemo(() => {
        const data = all as AllCandidates | undefined
        const names = data?.[0] ?? []
        const votes = (data?.[2] ?? []).map(v => Number(v))
        const total = votes.reduce((a, b) => a + b, 0)
        let wi = -1
        let best = -1
        votes.forEach((v, i) => {
            if (v > best) {
                best = v
                wi = i
            }
        })
        return { names, votes, winnerIndex: wi, total }
    }, [all])

    if (!names.length) {
        return (
            <div style={{ padding: '1rem', background: '#fde8e8', color: '#9b2c2c', borderRadius: 12 }}>
                Error fetching results. Check if candidates are initialized.
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    Using getAllCandidates() from ABI.
                </div>
            </div>
        )
    }

    const safeTotal = total || 1

    return (
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.95)', borderRadius: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Election Results</h3>

            {ended && winnerIndex >= 0 && (
                <div
                    style={{
                        marginBottom: 14,
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: '#c6f6d5',
                        color: '#22543d',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <span>Winner: {names[winnerIndex]}</span>
                    <span style={{ marginLeft: 'auto', opacity: 0.9 }}>
                        {votes[winnerIndex]} ({Math.round((votes[winnerIndex] / safeTotal) * 100)}%)
                    </span>
                </div>
            )}

            {!ended && (
                <div
                    style={{
                        marginBottom: 12,
                        padding: 10,
                        borderRadius: 8,
                        background: '#fffbea',
                        color: '#7a5d00',
                        fontWeight: 600,
                    }}
                >
                    Results are provisional. Final winner will be shown after the election ends.
                </div>
            )}

            {names.map((n, i) => {
                const pct = Math.round((votes[i] / safeTotal) * 100)
                const highlight = ended && i === winnerIndex
                return (
                    <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span>{n}</span>
                            <span>
                                {votes[i]} ({pct}%)
                            </span>
                        </div>
                        <div
                            style={{
                                height: 10,
                                background: '#e2e8f0',
                                borderRadius: 6,
                                overflow: 'hidden',
                                marginTop: 6,
                            }}
                        >
                            <div
                                style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: highlight ? '#667eea' : '#a3bffa',
                                }}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}