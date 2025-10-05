import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

interface ProofUploadProps {
    address: string | undefined;
    onProofLoaded: (proof: `0x${string}`[]) => void;
    isMobile?: boolean;
}

export function ProofUpload({ address, onProofLoaded, isMobile = false }: ProofUploadProps) {
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !address) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);

            if (!json.format || !json.tree || !json.values) {
                alert("Invalid proof file format");
                return;
            }

            const entry = json.values.find((v: { value: string[]; treeIndex: number }) =>
                v.value[0].toLowerCase() === address.toLowerCase()
            );

            if (!entry) {
                alert("Your address is not in the voter list");
                return;
            }

            const tree = StandardMerkleTree.load(json);
            const proof = tree.getProof(entry.treeIndex) as `0x${string}`[];

            onProofLoaded(proof);
            alert("Proof loaded successfully!");
        } catch (error) {
            console.error("Proof upload error:", error);
            alert("Failed to load proof file");
        }
    };

    return (
        <div style={{
            padding: isMobile ? "1rem" : "1.5rem",
            border: "2px dashed #cbd5e0",
            borderRadius: "12px",
            backgroundColor: "#f7fafc"
        }}>
            <h3 style={{ marginTop: 0, fontSize: isMobile ? "1rem" : "1.125rem" }}>
                Upload Proof
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
                onChange={handleUpload}
                style={{
                    padding: "0.5rem",
                    border: "1px solid #cbd5e0",
                    borderRadius: "6px",
                    width: "100%",
                    fontSize: isMobile ? "0.875rem" : "1rem"
                }}
            />
        </div>
    );
}