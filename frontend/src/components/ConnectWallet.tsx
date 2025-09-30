import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState, useEffect } from 'react';

export function ConnectWallet() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isConnected && address) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                gap: isMobile ? '0.5rem' : '1rem',
                padding: isMobile ? '0.75rem' : '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #EDF2F7 0%, #E2E8F0 100%)',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                    <div style={{
                        fontSize: isMobile ? '0.625rem' : '0.75rem',
                        color: '#4a5568',
                        marginBottom: '0.25rem'
                    }}>
                        Connected
                    </div>
                    <div style={{
                        fontFamily: 'monospace',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        color: '#2d3748'
                    }}>
                        {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                </div>
                <button
                    onClick={() => disconnect()}
                    style={{
                        padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #fc8181 0%, #f56565 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        transition: 'transform 0.2s',
                        width: isMobile ? '100%' : 'auto'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                padding: isMobile ? '0.75rem 1.25rem' : '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '1rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.4)',
                width: isMobile ? '100%' : 'auto'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.6)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(102, 126, 234, 0.4)';
            }}
        >
            Connect Wallet
        </button>
    );
}