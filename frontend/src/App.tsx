import { ConnectWallet } from './components/ConnectWallet';
import { ElectionStatus } from './components/ElectionStatus';

function App() {
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
        <h1>Voting DApp</h1>
        <ConnectWallet />
      </header>
      <main style={{ padding: '1rem' }}>
        <ElectionStatus />
        {/* We will add the Candidate List and Voting components here next */}
      </main>
    </div>
  );
}

export default App;