import { useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { votingABI } from '../contracts';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as `0x${string}`,
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

    // Get full candidate details with positions
    const { data: candidateDetails } = useReadContract({
        ...votingContract,
        functionName: "getCandidateDetails",
    });

    const calculateMatch = () => {
        if (!candidateDetails || !Array.isArray(candidateDetails) || candidateDetails.length < 2) {
            alert("No candidate position data available.");
            return;
        }

        const names = candidateDetails[0] as string[];
        const positions = candidateDetails[1] as number[][];

        const userPos = [economicPos, socialPos, foreignPos];
        let minDistance = Infinity;
        let bestMatch = '';

        for (let i = 0; i < names.length; i++) {
            const candidatePos = positions[i];

            if (!candidatePos || candidatePos.length !== 3) continue;

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

        if (bestMatch) {
            setMatchedCandidate(bestMatch);
        } else {
            alert("Could not calculate match.");
        }
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
                marginBottom: "1.5rem",
                fontSize: isMobile ? "1.25rem" : "1.5rem",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            }}>
                Find Your Match
            </h2>

            <div style={{ background: "#fff3cd", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.875rem" }}>
                Answer these questions to see which candidate best matches your views
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "0.9rem" }}>
                    Economic Policy
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>
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
                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#764ba2" }}>{economicPos}</div>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "0.9rem" }}>
                    Social Policy
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>
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
                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#764ba2" }}>{socialPos}</div>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "0.9rem" }}>
                    Foreign Policy
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>
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
                <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "700", color: "#764ba2" }}>{foreignPos}</div>
            </div>

            <button
                onClick={calculateMatch}
                style={{
                    width: "100%",
                    padding: isMobile ? "0.75rem" : "1rem",
                    background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "700",
                    fontSize: isMobile ? "1rem" : "1.125rem",
                    cursor: "pointer",
                    marginBottom: "1rem"
                }}
            >
                Calculate Match
            </button>

            {matchedCandidate && (
                <div style={{
                    background: "linear-gradient(135deg, #e7f3ff 0%, #f0e7ff 100%)",
                    padding: "16px",
                    borderRadius: "12px",
                    fontSize: "0.875rem",
                    border: "2px solid #764ba2"
                }}>
                    <strong style={{ fontSize: "1rem" }}>Your best match:</strong>
                    <div style={{ marginTop: "8px", fontSize: "1.5rem", fontWeight: "700", color: "#764ba2" }}>
                        {matchedCandidate}
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#666" }}>
                        Based on positions: [{economicPos}, {socialPos}, {foreignPos}]
                    </div>
                </div>
            )}
        </div>
    );
}