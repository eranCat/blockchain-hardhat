import React, { useCallback, useId, useRef } from 'react';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

export type ProofMap = Record<string, string[]>;

type OZDump = { format: 'standard-v1'; values: unknown[] };
type Prebuilt = { root: string; proofs: ProofMap };

export type ProofUploadProps = {
    address?: `0x${string}`;
    onProofLoaded?: (proof: `0x${string}`[] | null) => void;
    onRoot?: (root: string) => void;
    onProofs?: (map: ProofMap) => void;
    onError?: (err: unknown) => void;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

export function ProofUpload(props: ProofUploadProps) {
    const { address, onProofLoaded, onRoot, onProofs, onError, inputProps } = props;
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputEl = inputRef.current || e.currentTarget || null;
        try {
            const file = e.currentTarget?.files?.[0] ?? null;
            if (!file) return;

            const text = await file.text();
            const json = JSON.parse(text) as unknown;

            if (typeof json === 'object' && json !== null && (json as OZDump).format === 'standard-v1' && Array.isArray((json as OZDump).values)) {
                const tree = StandardMerkleTree.load(json as any);
                onRoot?.(tree.root);
                const proofs: ProofMap = {};
                for (const [i, v] of tree.entries()) {
                    const addr = (v as [string])[0];
                    proofs[addr] = tree.getProof(i);
                }
                onProofs?.(proofs);
                if (address && onProofLoaded) {
                    const key = Object.keys(proofs).find(k => k.toLowerCase() === address.toLowerCase());
                    onProofLoaded((key ? proofs[key] : null) as `0x${string}`[] | null);
                }
                return;
            }

            if (typeof json === 'object' && json !== null && typeof (json as Prebuilt).root === 'string' && typeof (json as Prebuilt).proofs === 'object') {
                const { root, proofs } = json as Prebuilt;
                onRoot?.(root);
                onProofs?.(proofs);
                if (address && onProofLoaded) {
                    const key = Object.keys(proofs).find(k => k.toLowerCase() === address.toLowerCase());
                    onProofLoaded((key ? proofs[key] : null) as `0x${string}`[] | null);
                }
                return;
            }

            throw new Error('Unsupported file format. Provide OZ dump or { root, proofs }.');
        } catch (err) {
            onError?.(err);
            console.error('Proof upload error:', err);
        } finally {
            if (inputEl) inputEl.value = '';
        }
    }, [address, onProofLoaded, onProofs, onRoot]);

    return (
        <input id={inputId} ref={inputRef} type="file" accept="application/json" onChange={handleUpload} {...inputProps} />
    );
}

export default ProofUpload;
