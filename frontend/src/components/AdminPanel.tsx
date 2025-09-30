import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

export function AdminPanel() {
    const { address } = useAccount();
    const [isMobile, setIsMobile] = useState(false);
    const [showPanel, setShowPanel] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check if user is admin
    const isAdmin = address === import.meta.env.VITE_ADMIN_ADDRESS;

    if (!isAdmin) return null;

    return (
        <div style={{
            padding: isMobile ? '1rem' : '1.5rem',
            background: 'linear-gradient(135deg, rgba(237, 137, 54, 0.1) 0%, rgba(221, 107, 32, 0.1) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '2px solid #ed8936',
            animation: 'slideIn 0.5s ease-out 0.3s both'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: showPanel ? '1rem' : 0
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: isMobile ? '1rem' : '1.125rem',
                    fontWeight: 'bold',
                    color: '#c05621'
                }}>
                    🔑 Admin Controls
                </h3>
                <button
                    onClick={() => setShowPanel(!showPanel)}
                    style={{
                        padding: '0.25rem 0.5rem',
                        background: 'transparent',
                        border: '1px solid #ed8936',
                        borderRadius: '4px',
                        color: '#ed8936',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                    }}
                >
                    {showPanel ? 'Hide' : 'Show'}
                </button>
            </div>

            {showPanel && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    <button
                        style={{
                            width: '100%',
                            padding: isMobile ? '0.5rem' : '0.75rem',
                            background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Add Candidate
                    </button>
                    <button
                        style={{
                            width: '100%',
                            padding: isMobile ? '0.5rem' : '0.75rem',
                            background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Manage Voters
                    </button>
                    <button
                        style={{
                            width: '100%',
                            padding: isMobile ? '0.5rem' : '0.75rem',
                            background: 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Set Time Window
                    </button>
                    <button
                        style={{
                            width: '100%',
                            padding: isMobile ? '0.5rem' : '0.75rem',
                            background: 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        End Election
                    </button>
                </div>
            )}
        </div>
    );
}