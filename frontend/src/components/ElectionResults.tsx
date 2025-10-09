import { useMemo, useState, useEffect } from 'react' // Import useState and useEffect
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
        query: { refetchInterval: 15000 },
    })

    const { data: endTs } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'endTime',
        query: { refetchInterval: 60000 },
    })

    // 1. State to track if the election has ended reactively
    const [electionHasEnded, setElectionHasEnded] = useState(false)

    // 2. Effect to check the time and set a timer for the end
    useEffect(() => {
        if (!endTs) return // Do nothing if the end time isn't loaded

        // Calculate delay until the election ends
        const endTimeMs = Number(endTs) * 1000
        const delay = endTimeMs - Date.now()

        // If the election has already ended, update state immediately
        if (delay <= 0) {
            setElectionHasEnded(true)
            return
        }

        // Set a timer that will update the state exactly when the election ends
        const timerId = setTimeout(() => {
            setElectionHasEnded(true)
        }, delay)

        // Cleanup: clear the timer if the component unmounts or endTs changes
        return () => clearTimeout(timerId)
    }, [endTs]) // This effect re-runs if the election's end time changes

    useWatchContractEvent({
        address: VOTING_ADDRESS,
        abi: votingABI,
        eventName: 'Voted',
        onLogs: () => refetchAll(),
    })
    useWatchContractEvent({
        address: VOTING_ADDRESS,
        abi: votingABI,
        eventName: 'CandidatesCleared',
        onLogs: () => refetchAll(),
    })

    const { names, winnerIndex } = useMemo(() => {
        const data = all as AllCandidates | undefined
        const names = data?.[0] ?? []
        const votes = (data?.[2] ?? []).map(v => Number(v))
        let wi = -1
        let best = -1
        votes.forEach((v, i) => {
            if (v > best) {
                best = v
                wi = i
            }
        })
        return { names, winnerIndex: wi }
    }, [all])

    if (!names.length) {
        return (
            <div style={{ padding: '1rem', background: '#fde8e8', color: '#9b2c2c', borderRadius: 12 }}>
                Error fetching results. Check if candidates are initialized.
            </div>
        )
    }

    return (
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.95)', borderRadius: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Election Results</h3>

            {/* 3. Use the new state variable to control the UI */}
            {electionHasEnded ? (
                winnerIndex >= 0 ? (
                    <div
                        style={{
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
                    </div>
                ) : (
                    <div
                        style={{
                            padding: 10,
                            borderRadius: 8,
                            background: '#fffbea',
                            color: '#7a5d00',
                        }}
                    >
                        The election has ended, but no winner could be determined.
                    </div>
                )
            ) : (
                <div
                    style={{
                        padding: 10,
                        borderRadius: 8,
                        background: '#fffbea',
                        color: '#7a5d00',
                        fontWeight: 600,
                    }}
                >
                    The winner will be announced after the election ends.
                </div>
            )}
        </div>
    )
}