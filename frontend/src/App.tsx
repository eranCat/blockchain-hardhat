import { ConnectWallet } from './components/ConnectWallet';
import { ElectionStatus } from './components/ElectionStatus';
import { CandidateList } from './components/CandidateList';
import { BALBalance } from './components/BALBalance';
import { ElectionResults } from './components/ElectionResults';
import { AdminPanel } from './components/AdminPanel'; // NEW
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
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: '700',
            background: 'linear-gradient(45deg, #4a5568 0%, #2d3748 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            🗳️ Voting DApp
          </h1>
          <ConnectWallet />
        </div>
      </header>

      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: isMobile ? '1.5rem 1rem' : '3rem 2rem',
        flexGrow: 1
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
            gap: '1.5rem'
          }}>
            <AdminPanel /> {/* NEW - Shows only to admin */}
            <ElectionStatus />
            <BALBalance />
          </div>

          <div style={{
            gridColumn: isMobile ? '1' : 'span 8',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <CandidateList />
            <ElectionResults />
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
            color: '#718096'
          }}>
            A decentralized application built for the 2025 elections.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;