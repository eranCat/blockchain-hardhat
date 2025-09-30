import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function ConnectWallet() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected) {
        return (
            <div>
                <p>Connected: {address}</p>
                <button onClick={() => disconnect()}>Disconnect</button>
            </div>
        );
    }

    return <button onClick={() => connect({ connector: injected() })}>Connect Wallet</button>;
}