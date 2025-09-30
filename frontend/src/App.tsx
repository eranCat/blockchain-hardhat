import { ConnectWallet } from './components/ConnectWallet';
import { ElectionStatus } from './components/ElectionStatus';
import { CandidateList } from './components/CandidateList';
import { BALBalance } from './components/BALBalance';

function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7fafc' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 'bold', color: '#2d3748' }}>
            Voting DApp
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#718096', fontSize: '0.875rem' }}>
            2025 Elections - Secure Blockchain Voting
          </p>
        </div>
        <ConnectWallet />
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <ElectionStatus />
          <BALBalance />
          <CandidateList />
        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '2rem',
        color: '#718096',
        fontSize: '0.875rem',
        borderTop: '1px solid #e2e8f0',
        marginTop: '3rem'
      }}>
        <p style={{ marginBottom: '0.5rem' }}>
          Powered by Ethereum • Merkle Proof Verification • ERC20 Rewards
        </p>
        <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#a0aec0' }}>
          Contract: {import.meta.env.VITE_VOTING_CONTRACT_ADDRESS}
        </p>
      </footer>
    </div>
  );
}

export default App;