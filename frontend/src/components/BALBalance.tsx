import { useReadContract, useAccount } from 'wagmi';
import { balTokenABI } from '../contracts';

const balTokenContract = {
    address: import.meta.env.VITE_BAL_TOKEN_CONTRACT_ADDRESS as `0x${string}`,
    abi: balTokenABI,
} as const;

export function BALBalance() {
    const { address } = useAccount();

    const { data: balance } = useReadContract({
        ...balTokenContract,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    const { data: symbol } = useReadContract({
        ...balTokenContract,
        functionName: 'symbol',
    });

    if (!address) return null;

    const formattedBalance = balance ? (Number(balance) / 10 ** 18).toFixed(2) : '0.00';

    return (
        <div style={{
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '2px solid #f6ad55'
        }}>
            <div style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '0.5rem' }}>
                Your Reward Balance
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c05621' }}>
                {formattedBalance} {symbol || 'BAL'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.5rem' }}>
                Earned from voting participation
            </div>
        </div>
    );
}