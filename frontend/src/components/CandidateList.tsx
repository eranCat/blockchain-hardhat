import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { votingABI } from '../contracts';

const votingContract = {
    address: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS as "0x${string}",
    abi: votingABI,
} as const;

export function CandidateList() {
    const { address } = useAccount();
    const [proofData, setProofData] = useState<"0x${string}"[] | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 1. UPDATED: Destructuring error and isLoading to debug fetching
    const {
        data: candidatesData,
        error: readError,
        isLoading: readLoading,
        refetch
    } = useReadContract({
        ...votingContract,
        functionName: "getCandidates",
    });

    const { data: hasVoted, refetch: refetchVoted } = useReadContract({
        ...votingContract,
        functionName: "hasVoted",
        args: address ? [address] : undefined,
    });

    const { data: hash } = useWriteContract();
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
                    alert("✅ Proof loaded successfully!");
                } else {
                    alert("❌ No proof found for your address");
                }
            } catch {
                alert("❌ Invalid proof file format");
            }
        };
        reader.readAsText(file);
    };


    // 2. NEW: Check for a contract read error first
    if (readError) {
        console.error("Wagmi Read Contract Error:", readError);
        return (
            <div style={{
                padding: "2rem",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "16px",
                color: "#e53e3e" // Red color for clear error message
            }}>
                ❌ Error loading candidates: {readError.message}
            </div>
        );
    }

    // 3. UPDATED: Check for loading or missing data
    if (readLoading || !candidatesData) {
        return (
            <div style={{
                padding: "2rem",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "16px"
            }}>
                <div className="spinner"></div> Loading candidates...
            </div>
        );
    }

    const candidates = candidatesData as string[];

    return (
        <div style={{
            padding: isMobile ? "1rem" : "1.5rem",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            animation: "slideIn 0.5s ease-out 0.2s both"
        }}>
            <h2 style={{
                marginBottom: "1.5rem",
                fontSize: isMobile ? "1.25rem" : "1.5rem",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
            }}>
                Candidates ({candidates.length})
            </h2>

            {address && !hasVoted && !proofData && (
                <div style={{
                    marginBottom: "1.5rem",
                    padding: isMobile ? "1rem" : "1.5rem",
                    border: "2px dashed #cbd5e0",
                    borderRadius: "12px",
                    backgroundColor: "#f7fafc"
                }}>
                    <h3 style={{ marginTop: 0, fontSize: isMobile ? "1rem" : "1.125rem" }}>
                        📄 Upload Voting Proof
                    </h3>
                    <p style={{
                        color: "#4a5568",
                        marginBottom: "1rem",
                        fontSize: isMobile ? "0.75rem" : "0.875rem"
                    }}>
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
            )}

            {hasVoted as boolean && (
                <div style={{
                    padding: "1rem",
                    background: "linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%)",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                    color: "#22543d",
                    fontWeight: "600",
                    fontSize: isMobile ? "0.875rem" : "1rem"
                }}>
                    ✅ You have already voted
                </div>
            )}

        </div>
    );
}