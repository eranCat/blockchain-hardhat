import { useReadContract } from 'wagmi';
// Use type-only import for clean code with strict compiler settings
import type { ReadContractReturnType } from 'viem';
import { votingABI } from '../contracts';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: votingABI,
} as const;

// Define the precise return type for getWindow: [uint64, uint64] maps to [bigint, bigint]
type GetWindowReturnType = ReadContractReturnType<typeof votingContract.abi, 'getWindow'>;

export function ElectionStatus() {

    console.log("DEBUG: Contract Address Used:", votingContract.address);
    console.log("DEBUG: Voting ABI Status:", votingABI ? 'Loaded' : 'Missing');

    // **The Fix:** Assert the type on the data field directly during destructuring
    const {
        data: windowTuple,
        isLoading,
        isError,
        error
        // Asserting the full object type ensures TypeScript is happy with the data field.
    } = useReadContract({
        ...votingContract,
        functionName: 'getWindow',
    }) as { data: GetWindowReturnType | undefined, isLoading: boolean, isError: boolean, error: unknown }; // Using 'unknown' for error is standard and safe.

    if (isLoading) return <div>Loading election status...</div>;

    if (isError) {
        console.error("DEBUG: Election Status Error:", error);
        return (
            <div>
                Error fetching election status. Is the contract address in .env.local correct?
                <p style={{ color: 'red', fontSize: '0.8rem' }}>
                    **Wagmi Error:** {(error as Error)?.message || 'Unknown RPC error. Check network configuration.'}
                </p>
            </div>
        );
    }

    // 1. Guard against undefined data.
    if (!windowTuple) return <div>Failed to read election window data.</div>;

    // 2. Access the second element (endTime) directly, which is now safely typed.
    const endTime = windowTuple[1];

    if (endTime === 0n) return <div>Election window not set yet.</div>;


    const endDate = new Date(Number(endTime) * 1000);
    const now = new Date();
    const status = now > endDate ? 'Closed' : 'Open';

    return (
        <div>
            <h2>Election Status: {status}</h2>
            <p>Voting ends on: {endDate.toLocaleString()}</p>
        </div>
    );
}