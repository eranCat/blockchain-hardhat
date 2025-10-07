import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { votingABI } from '../contracts'

const VOTING_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`

export function ElectionStatus() {
    const { data: startTs } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'startTime',
    })
    const { data: endTs } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'endTime',
    })
    const { data: isActive } = useReadContract({
        address: VOTING_ADDRESS,
        abi: votingABI,
        functionName: 'isActive',
    })

    const start = useMemo(() => (startTs ? Number(startTs) * 1000 : null), [startTs])
    const end = useMemo(() => (endTs ? Number(endTs) * 1000 : null), [endTs])
    const now = Date.now()

    const statusText = isActive ? 'Active' : end && now > end ? 'Ended' : 'Not started'

    if (!start || !end) {
        return (
            <div style={{ padding: '1rem', background: '#fde8e8', color: '#9b2c2c', borderRadius: 12 }}>
                Error loading election status
            </div>
        )
    }

    return (
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.95)', borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Election Status: {String(statusText)}</div>
            <div style={{ color: '#4a5568' }}>
                <div>Start: {new Date(start).toLocaleString()}</div>
                <div>End: {new Date(end).toLocaleString()}</div>
            </div>
        </div>
    )
}