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
        <span>
            💰 {formattedBalance} {symbol || 'BAL'} Ballance
        </span>
    );
}