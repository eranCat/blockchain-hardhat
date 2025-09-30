import { ConnectWallet } from './components/ConnectWallet';
import { ElectionStatus } from './components/ElectionStatus';
import { CandidateList } from './components/CandidateList';
import { BALBalance } from './components/BALBalance';
import { useState, useEffect } from 'react';

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <header style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: isMobile ? '1rem' : '1.5rem 2rem',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '1rem' : '0'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              🗳️ Voting DApp
            </h1>
            <p style={{
              margin: '0.25rem 0 0 0',
              color: '#718096',
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}>
              2025 Elections • Secure Blockchain Voting
            </p>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: isMobile ? '1rem' : '2rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)',
          gap: isMobile ? '1rem' : '1.5rem'
        }}>
          <div style={{
            gridColumn: isMobile ? '1' : 'span 4',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <ElectionStatus />
            <BALBalance />
          </div>

          <div style={{
            gridColumn: isMobile ? '1' : 'span 8'
          }}>
            <CandidateList />
          </div>
        </div>
      </main>

      <footer style={{
        marginTop: '3rem',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: isMobile ? '1.5rem 1rem' : '2rem',
          textAlign: 'center'
        }}>
          <p style={{
            marginBottom: '0.5rem',
            color: '#4a5568',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: '600'
          }}>
            Powered by Ethereum • Merkle Proof Verification • ERC20 Rewards
          </p>
          <p style={{
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontFamily: 'monospace',
            color: '#a0aec0',
            wordBreak: 'break-all'
          }}>
            Contract: {import.meta.env.VITE_VOTING_CONTRACT_ADDRESS || '0x...'}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;