import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { votingABI } from '../contracts';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: votingABI,
} as const;

export function VotingPanel() {
    const { address } = useAccount();
    const [proofData, setProofData] = useState<`0x${string}`[] | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [voteMode, setVoteMode] = useState<'direct' | 'questionnaire'>('direct');

    // Questionnaire positions
    const [economicPos, setEconomicPos] = useState(5);
    const [socialPos, setSocialPos] = useState(5);
    const [foreignPos, setForeignPos] = useState(5);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Try getCandidates first (frontend-optimized function from docs)
    const { data: candidatesData, error: candidatesError, refetch: refetchCandidates } = useReadContract({
        ...votingContract,
        functionName: "getCandidates",
        query: {
            enabled: true,
        }
    });

    const { data: hasVoted, refetch: refetchVoted } = useReadContract({
        ...votingContract,
        functionName: "hasVoted",
        args: address ? [address] : undefined,
    });

    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isSuccess } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isSuccess) {
            setSelectedCandidate(null);
            setTimeout(() => {
                refetchCandidates();
                refetchVoted();
            }, 2000);
        }
    }, [isSuccess, refetchCandidates, refetchVoted]);

    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const userProof = json[address?.toLowerCase() || ""];
                if (userProof && Array.isArray(userProof)) {
                    setProofData(userProof);
                    alert("✅ Proof loaded!");
                } else {
                    alert("❌ No proof for your address");
                }
            } catch {
                alert("❌ Invalid proof file");
            }
        };
        reader.readAsText(file);
    };

    const handleDirectVote = () => {
        if (!address || !proofData || selectedCandidate === null) return;
        writeContract({
            ...votingContract,
            functionName: "vote",
            args: [BigInt(selectedCandidate), proofData],
        });
    };

    const handleQuestionnaireVote = () => {
        if (!address || !proofData) return;
        writeContract({
            ...votingContract,
            functionName: "voteByQuestionnaire",
            args: [[economicPos, socialPos, foreignPos], proofData],
        });
    };

    if (!address) {
        return (
            <div style={{
                padding: isMobile ? "1rem" : "1.5rem",
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "16px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                textAlign: "center",
                color: "#718096"
            }}>
                Connect wallet to vote
            </div>
        );
    }

    if (hasVoted) {
        return (
            <div style={{
                padding: isMobile ? "1rem" : "1.5rem",
                background: "linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%)",
                borderRadius: "16px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                color: "#22543d",
                fontWeight: "600",
                textAlign: "center"
            }}>
                ✅ You have already voted
            </div>
        );
    }

    // Parse candidate data - remove duplicates
    const candidates = candidatesData ? Array.from(new Set(candidatesData as any[])) : [];

    return (
        <div style={{
            padding: isMobile ? "1rem" : "1.5rem",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            border: "2px solid #667eea"
        }}>
            <h2 style={{
                marginTop: 0,
                marginBottom: "1.5rem",
                fontSize: isMobile ? "1.25rem" : "1.5rem",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            }}>
                🗳️ Cast Your Vote
            </h2>

            {!proofData ? (
                <div style={{
                    padding: isMobile ? "1rem" : "1.5rem",
                    border: "2px dashed #cbd5e0",
                    borderRadius: "12px",
                    backgroundColor: "#f7fafc"
                }}>
                    <h3 style={{ marginTop: 0, fontSize: isMobile ? "1rem" : "1.125rem" }}>
                        📄 Step 1: Upload Proof
                    </h3>
                    <p style={{ color: "#4a5568", marginBottom: "1rem", fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                        Upload your proofs.json file to verify eligibility
                    </p>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleProofUpload}
                        style={{
                            padding: "0.5rem",
                            border: "1px solid #cbd5e0",
                            borderRadius: "6px",
                            width: "100%",
                            fontSize: isMobile ? "0.875rem" : "1rem"
                        }}
                    />
                </div>
            ) : (
                <>
                    <div style={{
                        padding: "1rem",
                        backgroundColor: "#e6fffa",
                        borderRadius: "8px",
                        marginBottom: "1.5rem",
                        color: "#234e52",
                        fontSize: isMobile ? "0.875rem" : "1rem"
                    }}>
                        ✅ Proof verified - Select voting method
                    </div>

                    {/* Vote Mode Toggle */}
                    <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
                        <button onClick={() => setVoteMode('direct')} style={{
                            flex: 1,
                            padding: "12px",
                            border: `2px solid ${voteMode === 'direct' ? '#667eea' : '#e0e0e0'}`,
                            background: voteMode === 'direct' ? '#667eea' : 'white',
                            color: voteMode === 'direct' ? 'white' : '#333',
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontSize: isMobile ? "0.875rem" : "1rem"
                        }}>
                            Direct
                        </button>
                        <button onClick={() => setVoteMode('questionnaire')} style={{
                            flex: 1,
                            padding: "12px",
                            border: `2px solid ${voteMode === 'questionnaire' ? '#667eea' : '#e0e0e0'}`,
                            background: voteMode === 'questionnaire' ? '#667eea' : 'white',
                            color: voteMode === 'questionnaire' ? 'white' : '#333',
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontSize: isMobile ? "0.875rem" : "1rem"
                        }}>
                            Questionnaire
                        </button>
                    </div>

                    {/* Direct Voting */}
                    {voteMode === 'direct' && (
                        <div>
                            {candidates.length === 0 ? (
                                <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                                    Loading candidates...
                                </div>
                            ) : (
                                <div style={{ marginBottom: "1.5rem", display: "grid", gap: "0.75rem" }}>
                                    {candidates.map((candidate: any, index: number) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedCandidate(index)}
                                            style={{
                                                padding: isMobile ? "1rem" : "1.25rem",
                                                border: selectedCandidate === index ? "3px solid #667eea" : "2px solid #e2e8f0",
                                                borderRadius: "12px",
                                                backgroundColor: selectedCandidate === index ? "#edf2f7" : "#ffffff",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                transition: "all 0.2s"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                <div style={{
                                                    width: "24px",
                                                    height: "24px",
                                                    borderRadius: "50%",
                                                    border: selectedCandidate === index ? "2px solid #667eea" : "2px solid #cbd5e0",
                                                    backgroundColor: selectedCandidate === index ? "#667eea" : "transparent",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "white",
                                                    fontSize: "0.75rem"
                                                }}>
                                                    {selectedCandidate === index && "✓"}
                                                </div>
                                                <div style={{ fontWeight: "600" }}>
                                                    {candidate}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={handleDirectVote}
                                disabled={selectedCandidate === null || isPending}
                                style={{
                                    width: "100%",
                                    padding: isMobile ? "0.75rem" : "1rem",
                                    backgroundColor: selectedCandidate === null || isPending ? "#cbd5e0" : "#667eea",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "12px",
                                    fontWeight: "700",
                                    fontSize: isMobile ? "1rem" : "1.125rem",
                                    cursor: selectedCandidate === null || isPending ? "not-allowed" : "pointer"
                                }}
                            >
                                {isPending ? "Submitting..." : "Submit Vote"}
                            </button>
                        </div>
                    )}

                    {/* Questionnaire Voting */}
                    {voteMode === 'questionnaire' && (
                        <div>
                            <div style={{ background: "#fff3cd", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.875rem" }}>
                                Your answers match to the closest candidate. You won't know who you voted for (anonymous).
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "0.9rem" }}>
                                    Economic Policy
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>
                                        <span>Free Market</span>
                                        <span>Gov Control</span>
                                    </div>
                                </label>
                                <input type="range" min="0" max="10" value={economicPos} onChange={(e) => setEconomicPos(Number(e.target.value))} style={{ width: "100%" }} />
                                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#667eea" }}>{economicPos}</div>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "0.9rem" }}>
                                    Social Policy
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>
                                        <span>Traditional</span>
                                        <span>Progressive</span>
                                    </div>
                                </label>
                                <input type="range" min="0" max="10" value={socialPos} onChange={(e) => setSocialPos(Number(e.target.value))} style={{ width: "100%" }} />
                                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#667eea" }}>{socialPos}</div>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "0.9rem" }}>
                                    Foreign Policy
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>
                                        <span>Isolationist</span>
                                        <span>Interventionist</span>
                                    </div>
                                </label>
                                <input type="range" min="0" max="10" value={foreignPos} onChange={(e) => setForeignPos(Number(e.target.value))} style={{ width: "100%" }} />
                                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#667eea" }}>{foreignPos}</div>
                            </div>

                            <div style={{ background: "#e7f3ff", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.875rem" }}>
                                <strong>Your Positions:</strong> [{economicPos}, {socialPos}, {foreignPos}]
                            </div>

                            <button
                                onClick={handleQuestionnaireVote}
                                disabled={isPending}
                                style={{
                                    width: "100%",
                                    padding: isMobile ? "0.75rem" : "1rem",
                                    background: isPending ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "12px",
                                    fontWeight: "700",
                                    fontSize: isMobile ? "1rem" : "1.125rem",
                                    cursor: isPending ? "not-allowed" : "pointer"
                                }}
                            >
                                {isPending ? "Submitting..." : "Submit Anonymous Vote"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}