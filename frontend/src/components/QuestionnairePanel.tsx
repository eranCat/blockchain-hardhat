import { useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { votingABI } from '../contracts';

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

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const { data: candidatesData } = useReadContract({
        ...votingContract,
        functionName: "getAllCandidates",
    });

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

        setMatchedCandidate(bestMatch);
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
                Find Your Match
            </h2>

            <div style={{ background: "#fff3cd", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "0.8rem" }}>
                See which candidate matches your views
            </div>

            <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "6px", fontSize: "0.85rem" }}>
                    Economic Policy
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#666", marginTop: "2px" }}>
                        <span>Free Market</span>
                        <span>Gov Control</span>
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
                    Social Policy
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
                    Foreign Policy
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
                    background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
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
                    border: "2px solid #764ba2"
                }}>
                    <strong style={{ fontSize: "0.9rem" }}>Your best match:</strong>
                    <div style={{ marginTop: "6px", fontSize: "1.25rem", fontWeight: "700", color: "#764ba2" }}>
                        {matchedCandidate}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#666" }}>
                        Positions: [{economicPos}, {socialPos}, {foreignPos}]
                    </div>
                </div>
            )}
        </div>
    );
}