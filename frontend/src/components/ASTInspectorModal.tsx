import React, { useState } from "react";
import { X, Copy, Check, Code2, Network, Cpu, ShieldCheck } from "lucide-react";
import { getASTSnapshot } from "../services/websocketService";
import type { Document } from "../types/document";

interface ASTInspectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: Document;
}

export const ASTInspectorModal: React.FC<ASTInspectorModalProps> = ({
    isOpen,
    onClose,
    document
}) => {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"tree" | "json" | "crdt">("tree");

    if (!isOpen) return null;

    const snapshot = getASTSnapshot();

    const handleCopyJson = () => {
        const fullAST = {
            documentId: document._id,
            title: document.title,
            timestamp: new Date().toISOString(),
            engine: "CRDT-Yjs Matrix + Mongoose AST",
            totalNodes: snapshot.totalNodes,
            astTree: snapshot.blocks.map((b, idx) => ({
                nodeId: b.id,
                sequenceIndex: idx,
                type: b.type,
                contentLength: b.contentLength,
                preview: b.preview,
                lockState: b.lockedBy ? `Locked (${b.lockedBy})` : "Unassigned / Open",
                crdtState: "Converged"
            }))
        };

        navigator.clipboard.writeText(JSON.stringify(fullAST, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            <Network className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold text-white">Live AST & CRDT Inspector</h3>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Live Sync
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Document ID: <span className="font-mono text-slate-300">{document._id}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopyJson}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied AST" : "Copy AST JSON"}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/30 text-xs font-medium">
                    <button
                        onClick={() => setActiveTab("tree")}
                        className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
                            activeTab === "tree"
                                ? "border-indigo-500 text-indigo-400 font-semibold"
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <Code2 className="w-4 h-4" />
                        Visual AST Nodes ({snapshot.totalNodes})
                    </button>
                    <button
                        onClick={() => setActiveTab("json")}
                        className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
                            activeTab === "json"
                                ? "border-indigo-500 text-indigo-400 font-semibold"
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <Cpu className="w-4 h-4" />
                        Raw AST JSON
                    </button>
                    <button
                        onClick={() => setActiveTab("crdt")}
                        className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
                            activeTab === "crdt"
                                ? "border-indigo-500 text-indigo-400 font-semibold"
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Conflict Resolution Matrix
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
                    {activeTab === "tree" && (
                        <div className="space-y-3">
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 flex items-center justify-between">
                                <span>Root Node: Document (ID: {document._id})</span>
                                <span className="text-emerald-400 font-sans font-semibold">Total AST Nodes: {snapshot.totalNodes}</span>
                            </div>

                            {snapshot.blocks.length === 0 ? (
                                <p className="text-slate-500 text-center py-8 font-sans">No blocks in document yet. Add a block to view its AST node.</p>
                            ) : (
                                snapshot.blocks.map((b, idx) => (
                                    <div
                                        key={b.id}
                                        className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-slate-700 transition"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-900/60 text-[10px] text-indigo-300 font-bold border border-indigo-700/50">
                                                    #{idx + 1}
                                                </span>
                                                <span className="font-semibold text-indigo-300 uppercase">{b.type}</span>
                                                <span className="text-slate-500">ID: {b.id.slice(0, 8)}...</span>
                                            </div>
                                            {b.lockedBy ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-900/40 text-amber-300 border border-amber-700/40 font-sans font-medium">
                                                    🔒 Lock: {b.lockedBy.slice(0, 6)}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-900/30 text-emerald-300 border border-emerald-700/30 font-sans">
                                                    Unlocked (Collaborative)
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/60 break-words font-sans text-xs">
                                            {b.preview || <span className="text-slate-500 italic">Empty block content</span>}
                                        </p>
                                        <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                                            <span>Length: {b.contentLength} chars</span>
                                            <span>CRDT Strategy: Zero-Overwrite LWW / Y.Text</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === "json" && (
                        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
                            {JSON.stringify(
                                {
                                    documentId: document._id,
                                    title: document.title,
                                    astStructure: {
                                        type: "RootDocumentNode",
                                        version: "CRDT-v1",
                                        childrenCount: snapshot.totalNodes,
                                        nodes: snapshot.blocks.map((b, i) => ({
                                            index: i,
                                            _id: b.id,
                                            type: b.type,
                                            contentLength: b.contentLength,
                                            contentSample: b.preview,
                                            isLocked: Boolean(b.lockedBy),
                                            lockOwnerId: b.lockedBy
                                        }))
                                    }
                                },
                                null,
                                2
                            )}
                        </pre>
                    )}

                    {activeTab === "crdt" && (
                        <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed">
                            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                    AST Structural Merging & Conflict Resolution
                                </h4>
                                <p className="text-slate-400">
                                    SyncDoc avoids destructive plain-text overwrite conflicts by modeling the document as an Abstract Syntax Tree (AST) coupled with a Conflict-free Replicated Data Type (CRDT) matrix.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="font-semibold text-indigo-300 mb-1">Localized Operational Locking</p>
                                    <p className="text-slate-400 text-[11px]">
                                        Granular block-level locks ensure atomic single-user active write windows on targeted AST nodes without blocking the rest of the document.
                                    </p>
                                </div>
                                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="font-semibold text-emerald-300 mb-1">State Vector Reconvergence</p>
                                    <p className="text-slate-400 text-[11px]">
                                        Binary transport deltas converge across concurrent clients via Yjs state vectors, ensuring mathematically deterministic state everywhere.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-400">
                    <span>SyncDoc Real-Time Collaborative Document Engine</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
