import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { votingABI } from '../contracts';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: votingABI,
} as const;

export function CandidateList() {
    const { address } = useAccount();
    const [proofData, setProofData] = useState<`0x${string}`[] | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [voteMode, setVoteMode] = useState<'direct' | 'questionnaire'>('direct');
    const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

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

    const { data: candidatesData, error: readError, isLoading: readLoading, refetch } = useReadContract({
        ...votingContract,
        functionName: "getCandidateDetails",
    });

    const { data: hasVoted, refetch: refetchVoted } = useReadContract({
        ...votingContract,
        functionName: "hasVoted",
        args: address ? [address] : undefined,
    });

    const { data: hash, writeContract } = useWriteContract();
    const { isSuccess } = useWaitForTransactionReceipt({ hash });

    if (isSuccess) {
        setTimeout(() => {
            refetch();
            refetchVoted();
        }, 2000);
    }

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

    const handleDirectVote = (candidateId: number) => {
        if (!proofData) {
            alert("Upload proof file first");
            return;
        }
        writeContract({
            ...votingContract,
            functionName: "vote",
            args: [BigInt(candidateId), proofData],
        });
    };

    const handleQuestionnaireVote = () => {
        if (!proofData) {
            alert("Upload proof file first");
            return;
        }
        writeContract({
            ...votingContract,
            functionName: "voteByQuestionnaire",
            args: [[economicPos, socialPos, foreignPos], proofData],
        });
    };

    if (readError) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", background: "rgba(255, 255, 255, 0.95)", borderRadius: "16px", color: "#e53e3e" }}>
                ❌ Error: {readError.message}
            </div>
        );
    }

    if (readLoading || !candidatesData) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", background: "rgba(255, 255, 255, 0.95)", borderRadius: "16px" }}>
                Loading candidates...
            </div>
        );
    }

    const names = (candidatesData as any)[0] as string[];
    const positions = (candidatesData as any)[1] as number[][];
    const votes = (candidatesData as any)[2] as bigint[];
    
    console.log(hasVoted, proofData);
    

    return (
        <div style={{
            padding: isMobile ? "1rem" : "1.5rem",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
            <h2 style={{
                marginBottom: "1.5rem",
                fontSize: isMobile ? "1.25rem" : "1.5rem",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            }}>
                Cast Your Vote
            </h2>

            {/* Proof Upload */}
            {address && !hasVoted && !proofData && (
                <div style={{
                    marginBottom: "1.5rem",
                    padding: isMobile ? "1rem" : "1.5rem",
                    border: "2px dashed #cbd5e0",
                    borderRadius: "12px",
                    backgroundColor: "#f7fafc"
                }}>
                    <h3 style={{ marginTop: 0, fontSize: isMobile ? "1rem" : "1.125rem" }}>📄 Upload Proof</h3>
                    <input type="file" accept=".json" onChange={handleProofUpload} style={{
                        padding: "0.5rem",
                        border: "1px solid #cbd5e0",
                        borderRadius: "6px",
                        width: "100%",
                        fontSize: isMobile ? "0.875rem" : "1rem"
                    }} />
                </div>
            )}

            {hasVoted && (
                <div style={{
                    padding: "1rem",
                    background: "linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%)",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                    color: "#22543d",
                    fontWeight: "600"
                }}>
                    ✅ You already voted
                </div>
            )}

            {/* Vote Mode Toggle */}
            {!hasVoted && proofData && (
                <>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
                        <button onClick={() => setVoteMode('direct')} style={{
                            flex: 1,
                            padding: "12px",
                            border: `2px solid ${voteMode === 'direct' ? '#667eea' : '#e0e0e0'}`,
                            background: voteMode === 'direct' ? '#667eea' : 'white',
                            color: voteMode === 'direct' ? 'white' : '#333',
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}>
                            Direct Vote
                        </button>
                        <button onClick={() => setVoteMode('questionnaire')} style={{
                            flex: 1,
                            padding: "12px",
                            border: `2px solid ${voteMode === 'questionnaire' ? '#667eea' : '#e0e0e0'}`,
                            background: voteMode === 'questionnaire' ? '#667eea' : 'white',
                            color: voteMode === 'questionnaire' ? 'white' : '#333',
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}>
                            Questionnaire (Anonymous)
                        </button>
                    </div>

                    {/* Direct Voting */}
                    {voteMode === 'direct' && (
                        <div>
                            <h3>Select Candidate</h3>
                            {names.map((name, i) => (
                                <div key={i} onClick={() => setSelectedCandidate(i)} style={{
                                    padding: "1rem",
                                    margin: "10px 0",
                                    border: `2px solid ${selectedCandidate === i ? '#667eea' : '#e0e0e0'}`,
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    background: selectedCandidate === i ? '#f0f4ff' : 'white'
                                }}>
                                    <h4 style={{ margin: "0 0 8px 0" }}>{name}</h4>
                                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                        <span style={{ background: "#667eea", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "0.85rem" }}>
                                            Economic: {positions[i][0]}
                                        </span>
                                        <span style={{ background: "#667eea", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "0.85rem" }}>
                                            Social: {positions[i][1]}
                                        </span>
                                        <span style={{ background: "#667eea", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "0.85rem" }}>
                                            Foreign: {positions[i][2]}
                                        </span>
                                    </div>
                                    <p style={{ margin: "8px 0 0 0", color: "#666" }}>Votes: {votes[i].toString()}</p>
                                </div>
                            ))}
                            <button onClick={() => selectedCandidate !== null && handleDirectVote(selectedCandidate)} disabled={selectedCandidate === null} style={{
                                width: "100%",
                                padding: "15px",
                                background: selectedCandidate === null ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "1.1rem",
                                fontWeight: "600",
                                cursor: selectedCandidate === null ? "not-allowed" : "pointer",
                                marginTop: "10px"
                            }}>
                                Submit Vote
                            </button>
                        </div>
                    )}

                    {/* Questionnaire Voting */}
                    {voteMode === 'questionnaire' && (
                        <div>
                            <div style={{ background: "#fff3cd", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
                                Your answers match to the closest candidate automatically. You won't know who you voted for (anonymous).
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                                    Economic Policy
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#666", marginTop: "4px" }}>
                                        <span>Free Market (0)</span>
                                        <span>Gov Control (10)</span>
                                    </div>
                                </label>
                                <input type="range" min="0" max="10" value={economicPos} onChange={(e) => setEconomicPos(Number(e.target.value))} style={{ width: "100%" }} />
                                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#667eea" }}>{economicPos}</div>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                                    Social Policy
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#666", marginTop: "4px" }}>
                                        <span>Traditional (0)</span>
                                        <span>Progressive (10)</span>
                                    </div>
                                </label>
                                <input type="range" min="0" max="10" value={socialPos} onChange={(e) => setSocialPos(Number(e.target.value))} style={{ width: "100%" }} />
                                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#667eea" }}>{socialPos}</div>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                                    Foreign Policy
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#666", marginTop: "4px" }}>
                                        <span>Isolationist (0)</span>
                                        <span>Interventionist (10)</span>
                                    </div>
                                </label>
                                <input type="range" min="0" max="10" value={foreignPos} onChange={(e) => setForeignPos(Number(e.target.value))} style={{ width: "100%" }} />
                                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#667eea" }}>{foreignPos}</div>
                            </div>

                            <div style={{ background: "#e7f3ff", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
                                <strong>Your Positions:</strong> [{economicPos}, {socialPos}, {foreignPos}]
                            </div>

                            <button onClick={handleQuestionnaireVote} style={{
                                width: "100%",
                                padding: "15px",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "1.1rem",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}>
                                Submit Anonymous Vote
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}