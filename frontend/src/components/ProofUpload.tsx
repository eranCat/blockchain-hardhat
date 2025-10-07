// frontend/src/components/ProofUpload.tsx
import React, { useCallback, useId, useRef } from 'react';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

export type ProofMap = Record<string, string[]>;

export type ProofUploadProps = {
    address?: `0x${string}`;
    onProofLoaded?: (proof: `0x${string}`[] | null) => void;
    isMobile?: boolean;
    onRoot?: (root: string) => void;
    onProofs?: (map: ProofMap) => void;
    onError?: (err: unknown) => void;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    children?: React.ReactNode | ((args: {
        handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
        inputId: string;
        inputRef: React.RefObject<HTMLInputElement | null>;
    }) => React.ReactNode);
};

export function ProofUpload(props: ProofUploadProps) {
    const { address, onProofLoaded, onRoot, onProofs, onError, inputProps, children } = props;

    const inputId = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputEl = inputRef.current || e.currentTarget || null;
        try {
            const file = e.currentTarget?.files?.[0] ?? null;
            if (!file) return;

            const text = await file.text();
            const json: any = JSON.parse(text);

            // Case A: OpenZeppelin StandardMerkleTree dump
            if (json?.format === 'standard-v1' && Array.isArray(json?.values)) {
                const tree = StandardMerkleTree.load(json);
                onRoot?.(tree.root);

                const proofs: ProofMap = {};
                for (const [i, v] of tree.entries()) {
                    const addr = (v as unknown as [string])[0];
                    proofs[addr] = tree.getProof(i); // use entry index per OZ docs
                }
                onProofs?.(proofs);

                if (address && onProofLoaded) {
                    const matchKey = Object.keys(proofs).find(k => k.toLowerCase() === address.toLowerCase());
                    onProofLoaded((matchKey ? proofs[matchKey] : null) as `0x${string}`[] | null);
                }
                return;
            }

            // Case B: { root, proofs }
            if (typeof json?.root === 'string' && json?.proofs && typeof json.proofs === 'object') {
                onRoot?.(json.root);
                onProofs?.(json.proofs as ProofMap);
                if (address && onProofLoaded) {
                    const proofsMap = json.proofs as ProofMap;
                    const matchKey = Object.keys(proofsMap).find(k => k.toLowerCase() === address.toLowerCase());
                    onProofLoaded((matchKey ? proofsMap[matchKey] : null) as `0x${string}`[] | null);
                }
                return;
            }

            throw new Error('Unsupported file format. Provide OZ tree dump or { root, proofs }.');

        } catch (err) {
            onError?.(err);
            console.error('Proof upload error:', err);
        } finally {
            if (inputEl) inputEl.value = ''; // allow re-uploading the same file
        }
    }, [address, onError, onProofLoaded, onProofs, onRoot]);

    if (typeof children === 'function') {
        return <>{children({ handleUpload, inputId, inputRef })}</>;
    }

    // Default minimal input (safe fallback; your design can pass a custom child)
    return (
        <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="application/json"
            onChange={handleUpload}
            {...inputProps}
        />
    );
}

export default ProofUpload;
