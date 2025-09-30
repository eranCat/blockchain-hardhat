import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function ConnectWallet() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected && address) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1.25rem',
                backgroundColor: '#edf2f7',
                borderRadius: '8px'
            }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: '#4a5568', marginBottom: '0.25rem' }}>
                        Connected Wallet
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '600' }}>
                        {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                </div>
                <button
                    onClick={() => disconnect()}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#fc8181',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                    }}
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => connect({ connector: injected() })}
            style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3182ce'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4299e1'}
        >
            Connect Wallet
        </button>
    );
}