import { useReadContract, useAccount } from 'wagmi';
import { balTokenABI } from '../contracts';
import { useState, useEffect } from 'react';

const balTokenContract = {
    address: import.meta.env.VITE_BAL_TOKEN_CONTRACT_ADDRESS as `0x${string}`,
    abi: balTokenABI,
} as const;

export function BALBalance() {
    const { address } = useAccount();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
            padding: isMobile ? '1rem' : '1.5rem',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 243, 199, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid #f6ad55',
            animation: 'slideIn 0.5s ease-out 0.1s both'
        }}>
            <div style={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                color: '#744210',
                marginBottom: '0.5rem',
                fontWeight: '600'
            }}>
                Your Reward Balance
            </div>
            <div style={{
                fontSize: isMobile ? '1.75rem' : '2.25rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #ed8936 0%, #c05621 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
            }}>
                {formattedBalance} {symbol || 'BAL'}
            </div>
            <div style={{
                fontSize: isMobile ? '0.625rem' : '0.75rem',
                color: '#975a16',
                marginTop: '0.5rem'
            }}>
                💰 Earned from voting participation
            </div>
        </div>
    );
}