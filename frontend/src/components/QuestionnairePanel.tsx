import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { votingABI } from '../contracts';
import { parseAbi } from 'viem';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`,
    abi: votingABI,
} as const;

export function QuestionnairePanel() {
    const [isMobile, setIsMobile] = useState(false);
    const [economicPos, setEconomicPos] = useState(5);
    const [socialPos, setSocialPos] = useState(5);
    const [foreignPos, setForeignPos] = useState(5);
    const [matchedCandidate, setMatchedCandidate] = useState<string | null>(null);
    const [matchDistance, setMatchDistance] = useState<number>(0);
    const [matchPercentage, setMatchPercentage] = useState<number>(0);
    const [userProof, setUserProof] = useState<`0x${string}`[] | null>(null);

    const { address } = useAccount();

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Load user's Merkle proof
    useEffect(() => {
        if (!address) return;

        fetch('/data/proofs/proofs.json')
            .then(res => res.json())
            .then(data => {
                const proof = data.proofs?.[address] ||
                    data.proofs?.[address.toLowerCase()] ||
                    data.proofs?.[address.toUpperCase()];
                if (proof) {
                    setUserProof(proof);
                }
            })
            .catch(err => console.error('Failed to load proof:', err));
    }, [address]);

    const { data: candidatesData } = useReadContract({
        ...votingContract,
        functionName: "getAllCandidates",
    });

    const { data: hasVotedData } = useReadContract({
        ...votingContract,
        functionName: "hasVoted",
        args: address ? [address] : undefined,
    });

    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const calculateMatch = () => {
        if (!candidatesData) {
            alert("No candidate data available.");
            return;
        }

        const [names, positions, _votes] = candidatesData as [string[], readonly number[][], bigint[]];

        if (names.length === 0) {
            alert("No candidates available.");
            return;
        }

        const userPos = [economicPos, socialPos, foreignPos];
        let minDistance = Infinity;
        let bestMatch = '';

        for (let i = 0; i < names.length; i++) {
            const candidatePos = positions[i];

            const distance = Math.sqrt(
                Math.pow(userPos[0] - candidatePos[0], 2) +
                Math.pow(userPos[1] - candidatePos[1], 2) +
                Math.pow(userPos[2] - candidatePos[2], 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = names[i];
            }
        }

        // Calculate match percentage (max distance for 3 dimensions: sqrt(10^2 + 10^2 + 10^2) = 17.32)
        const maxDistance = Math.sqrt(300); // sqrt(10^2 * 3)
        const percentage = Math.round((1 - minDistance / maxDistance) * 100);

        setMatchedCandidate(bestMatch);
        setMatchDistance(Math.round(minDistance * 10) / 10);
        setMatchPercentage(percentage);
    };

    const voteByQuestionnaire = () => {
        if (!address) {
            alert("Please connect your wallet first");
            return;
        }

        if (!userProof) {
            alert("No Merkle proof found for your address. Make sure you're in the voters list.");
            return;
        }

        if (hasVotedData) {
            alert("You have already voted in this election");
            return;
        }

        const positions = [economicPos, socialPos, foreignPos] as [number, number, number];

        writeContract({
            ...votingContract,
            functionName: 'voteByQuestionnaire',
            args: [positions, userProof],
        });
    };

    return (
        <div style={{
            padding: isMobile ? "1rem" : "1.5rem",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            border: "2px solid #764ba2"
        }}>
            <h2 style={{
                marginTop: 0,
                marginBottom: "1rem",
                fontSize: isMobile ? "1.1rem" : "1.25rem",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            }}>
                🎯 Anonymous Voting
            </h2>

            <div style={{
                background: "#e7f3ff",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "15px",
                fontSize: "0.8rem",
                border: "1px solid #90caf9"
            }}>
                <strong>ℹ️ How it works:</strong> Answer the questions about your positions.
                The smart contract will automatically find the candidate closest to your views
                <strong> without revealing your choice</strong>.
            </div>

            <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "6px", fontSize: "0.85rem" }}>
                    Economic Policy (0-10)
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#666", marginTop: "2px" }}>
                        <span>Free Market</span>
                        <span>Government Control</span>
                    </div>
                </label>
                <input
                    type="range"
                    min="0"
                    max="10"
                    value={economicPos}
                    onChange={(e) => setEconomicPos(Number(e.target.value))}
                    style={{ width: "100%" }}
                />
                <div style={{ textAlign: "center", fontSize: "1rem", fontWeight: "700", color: "#764ba2" }}>{economicPos}</div>
            </div>

            <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "6px", fontSize: "0.85rem" }}>
                    Social Policy (0-10)
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#666", marginTop: "2px" }}>
                        <span>Traditional</span>
                        <span>Progressive</span>
                    </div>
                </label>
                <input
                    type="range"
                    min="0"
                    max="10"
                    value={socialPos}
                    onChange={(e) => setSocialPos(Number(e.target.value))}
                    style={{ width: "100%" }}
                />
                <div style={{ textAlign: "center", fontSize: "1rem", fontWeight: "700", color: "#764ba2" }}>{socialPos}</div>
            </div>

            <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "6px", fontSize: "0.85rem" }}>
                    Foreign Policy (0-10)
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#666", marginTop: "2px" }}>
                        <span>Isolationist</span>
                        <span>Interventionist</span>
                    </div>
                </label>
                <input
                    type="range"
                    min="0"
                    max="10"
                    value={foreignPos}
                    onChange={(e) => setForeignPos(Number(e.target.value))}
                    style={{ width: "100%" }}
                />
                <div style={{ textAlign: "center", fontSize: "1rem", fontWeight: "700", color: "#764ba2" }}>{foreignPos}</div>
            </div>

            <button
                onClick={calculateMatch}
                style={{
                    width: "100%",
                    padding: isMobile ? "0.65rem" : "0.75rem",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "700",
                    fontSize: isMobile ? "0.9rem" : "1rem",
                    cursor: "pointer",
                    marginBottom: "0.75rem"
                }}
            >
                Calculate Match
            </button>

            {matchedCandidate && (
                <div style={{
                    background: "linear-gradient(135deg, #e7f3ff 0%, #f0e7ff 100%)",
                    padding: "12px",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    border: "2px solid #764ba2",
                    marginBottom: "0.75rem"
                }}>
                    <strong style={{ fontSize: "0.9rem" }}>Your best match:</strong>
                    <div style={{ marginTop: "6px", fontSize: "1.25rem", fontWeight: "700", color: "#764ba2" }}>
                        {matchedCandidate}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "0.85rem", color: "#555" }}>
                        Match: <strong style={{ color: "#764ba2" }}>{matchPercentage}%</strong>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "2px" }}>
                        Distance: {matchDistance}
                    </div>
                </div>
            )}

            <button
                onClick={voteByQuestionnaire}
                disabled={!address || !userProof || hasVotedData || isPending || isConfirming}
                style={{
                    width: "100%",
                    padding: isMobile ? "0.65rem" : "0.75rem",
                    background: (!address || !userProof || hasVotedData || isPending || isConfirming)
                        ? "#ccc"
                        : "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "700",
                    fontSize: isMobile ? "0.9rem" : "1rem",
                    cursor: (!address || !userProof || hasVotedData || isPending || isConfirming)
                        ? "not-allowed"
                        : "pointer",
                }}
            >
                {isPending ? "Confirming..." :
                    isConfirming ? "Waiting for confirmation..." :
                        hasVotedData ? "Already Voted" :
                            !address ? "Connect Wallet" :
                                !userProof ? "No Proof Available" :
                                    "🗳️ Vote Anonymously"}
            </button>

            {isSuccess && (
                <div style={{
                    marginTop: "0.75rem",
                    padding: "10px",
                    background: "#d4edda",
                    border: "1px solid #c3e6cb",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    color: "#155724"
                }}>
                    ✅ Vote successfully cast! Transaction: {hash?.slice(0, 10)}...
                </div>
            )}

            {!userProof && address && (
                <div style={{
                    marginTop: "0.75rem",
                    padding: "10px",
                    background: "#fff3cd",
                    border: "1px solid #ffc107",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    color: "#856404"
                }}>
                    ⚠️ No Merkle proof found. Make sure proofs.json is in /public/data/proofs/
                </div>
            )}
        </div>
    );
}