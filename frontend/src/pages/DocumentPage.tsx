import React, { useEffect, useState } from "react";
import type { Block, Document } from "../types/document";
import BlockRenderer from "../components/BlockRenderer";
import { ASTInspectorModal } from "../components/ASTInspectorModal";
import {
    blocks,
    blockOrder,
    blockTypes,
    addBlock,
    isSyncReady,
    onSyncReady,
    getCollaborators,
    onCollaboratorsUpdate
} from "../services/websocketService";
import { exportDocument, updateDocumentTitle } from "../services/documentService";
import { useToast } from "../context/ToastContext";
import {
    FileDown,
    Network,
    Share2,
    Plus,
    Loader2,
    FileText,
    Heading1,
    Code,
    Quote,
    Pencil,
    Check,
    Users
} from "lucide-react";

interface DocumentPageProps {
    document: Document;
    onBack?: () => void;
}

const DocumentPage: React.FC<DocumentPageProps> = ({ document }) => {
    const toast = useToast();

    const [collaborativeBlocks, setCollaborativeBlocks] = useState<Block[]>([]);
    const [syncCompleted, setSyncCompleted] = useState<boolean>(isSyncReady());
    const [collaboratorState, setCollaboratorState] = useState(getCollaborators());
    const [isExporting, setIsExporting] = useState(false);
    const [isASTModalOpen, setIsASTModalOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [documentTitle, setDocumentTitle] = useState(document.title);
    const [savingTitle, setSavingTitle] = useState(false);

    // Listen to collaborator updates
    useEffect(() => {
        const removeListener = onCollaboratorsUpdate((state) => {
            setCollaboratorState(state);
        });
        setCollaboratorState(getCollaborators());
        return removeListener;
    }, []);

    // Build Blocks from Yjs
    useEffect(() => {
        const rebuildBlocks = () => {
            const newBlocks: Block[] = [];
            const orderedBlockIds = blockOrder.toArray();

            orderedBlockIds.forEach((blockId) => {
                const sharedText = blocks.get(blockId);
                if (!sharedText) return;

                const blockType = blockTypes.get(blockId) ?? "paragraph";
                newBlocks.push({
                    _id: blockId,
                    type: blockType,
                    content: sharedText.toString(),
                    children: []
                });
            });

            if (newBlocks.length === 0 && document.blocks.length > 0 && !isSyncReady()) {
                setCollaborativeBlocks(document.blocks);
                return;
            }

            setCollaborativeBlocks(newBlocks);
        };

        rebuildBlocks();

        blockOrder.observe(rebuildBlocks);
        blockTypes.observe(rebuildBlocks);
        blocks.observe(rebuildBlocks);

        return () => {
            blockOrder.unobserve(rebuildBlocks);
            blockTypes.unobserve(rebuildBlocks);
            blocks.unobserve(rebuildBlocks);
        };
    }, [document.blocks]);

    // Listen to Sync Ready
    useEffect(() => {
        if (isSyncReady()) {
            setSyncCompleted(true);
            return;
        }

        const removeListener = onSyncReady(() => {
            setSyncCompleted(true);
        });

        const syncCheck = window.setInterval(() => {
            if (isSyncReady()) {
                setSyncCompleted(true);
                window.clearInterval(syncCheck);
            }
        }, 100);

        return () => {
            removeListener();
            window.clearInterval(syncCheck);
        };
    }, [document._id]);

    const handleBlockContentChange = (blockId: string, content: string): void => {
        setCollaborativeBlocks((currentBlocks) =>
            currentBlocks.map((block) => (block._id === blockId ? { ...block, content } : block))
        );
    };

    const handleAddBlock = (type: Block["type"], initialContent = ""): void => {
        if (!syncCompleted) {
            toast.warning("Synchronizing", "Please wait for sync to complete before adding blocks.");
            return;
        }

        const blockId = addBlock(type, initialContent);
        if (blockId) {
            toast.success("Block added", `Created a new ${type} block.`);
        }
    };

    // PDF Export
    const handleExport = async () => {
        try {
            setIsExporting(true);
            const blob = await exportDocument(document._id);
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement("a");
            a.href = url;
            a.download = `${documentTitle.replace(/\s+/g, "_")}.pdf`;
            window.document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            window.document.body.removeChild(a);
            toast.success("PDF Exported", "Your document was compiled from AST to PDF successfully.");
        } catch (error) {
            console.error("PDF export failed:", error);
            toast.error("Export Failed", "Failed to compile document to PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    // Share link
    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.info("Link Copied", "Collaboration URL copied to clipboard. Share with your team!");
    };

    // Save title
    const handleSaveTitle = async () => {
        if (!documentTitle.trim()) return;
        try {
            setSavingTitle(true);
            await updateDocumentTitle(document._id, documentTitle.trim());
            setIsEditingTitle(false);
            toast.success("Title updated", "Document renamed successfully.");
        } catch (error) {
            console.error("Failed to update title:", error);
            toast.error("Rename failed", "Could not update document title.");
        } finally {
            setSavingTitle(false);
        }
    };

    // Metrics
    const totalWords = collaborativeBlocks.reduce(
        (acc, b) => acc + (b.content.trim() ? b.content.trim().split(/\s+/).length : 0),
        0
    );

    const collaboratorColors = [
        "bg-indigo-500",
        "bg-emerald-500",
        "bg-violet-500",
        "bg-amber-500",
        "bg-rose-500",
        "bg-cyan-500"
    ];

    return (
        <div className="min-h-[85vh] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            {/* Top Workspace Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
                {/* Document Title & Status */}
                <div className="flex items-center gap-3">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={documentTitle}
                                onChange={(e) => setDocumentTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                                className="px-3 py-1 bg-white border border-indigo-400 rounded-lg text-lg font-bold text-slate-900 outline-none shadow-sm"
                                autoFocus
                            />
                            <button
                                onClick={handleSaveTitle}
                                disabled={savingTitle}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group/title">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{documentTitle}</h1>
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition"
                                title="Rename document"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Sync Status Pill */}
                    {syncCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            CRDT Matrix Synced
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                            Syncing CRDT...
                        </span>
                    )}
                </div>

                {/* Right Actions: Presence, AST, PDF, Share */}
                <div className="flex items-center gap-3">
                    {/* Collaborator Avatars Stack */}
                    <div className="flex items-center gap-1.5 pl-2">
                        <div className="flex -space-x-2 overflow-hidden items-center">
                            {collaboratorState.users.map((user, idx) => (
                                <div
                                    key={user.id}
                                    title={`Active: ${user.name}`}
                                    className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white shadow-sm ${
                                        collaboratorColors[idx % collaboratorColors.length]
                                    }`}
                                >
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-500" />
                            {collaboratorState.count} {collaboratorState.count === 1 ? "user" : "users"}
                        </span>
                    </div>

                    <div className="h-5 w-[1px] bg-slate-200" />

                    {/* AST Inspector Button */}
                    <button
                        type="button"
                        onClick={() => setIsASTModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm transition"
                    >
                        <Network className="w-3.5 h-3.5 text-indigo-400" />
                        <span>AST Tree Inspector</span>
                    </button>

                    {/* Export PDF Button */}
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium shadow-sm transition disabled:opacity-50"
                    >
                        {isExporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        ) : (
                            <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        <span>{isExporting ? "Compiling PDF..." : "Export PDF"}</span>
                    </button>

                    {/* Share Button */}
                    <button
                        type="button"
                        onClick={handleShare}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                        title="Copy collaboration link"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Document Sticky Quick Inserter Toolbar */}
            <div className="px-6 py-2.5 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">
                        Add Block
                    </span>
                    <button
                        type="button"
                        disabled={!syncCompleted}
                        onClick={() => handleAddBlock("paragraph")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition disabled:opacity-50"
                    >
                        <FileText className="w-3.5 h-3.5 text-slate-500" /> Paragraph
                    </button>
                    <button
                        type="button"
                        disabled={!syncCompleted}
                        onClick={() => handleAddBlock("heading")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition disabled:opacity-50"
                    >
                        <Heading1 className="w-3.5 h-3.5 text-slate-500" /> Heading
                    </button>
                    <button
                        type="button"
                        disabled={!syncCompleted}
                        onClick={() => handleAddBlock("code")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition disabled:opacity-50"
                    >
                        <Code className="w-3.5 h-3.5 text-slate-500" /> Code Snippet
                    </button>
                    <button
                        type="button"
                        disabled={!syncCompleted}
                        onClick={() => handleAddBlock("quote")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition disabled:opacity-50"
                    >
                        <Quote className="w-3.5 h-3.5 text-slate-500" /> Blockquote
                    </button>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>{collaborativeBlocks.length} AST blocks</span>
                    <span>•</span>
                    <span>{totalWords} words</span>
                </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 p-8 max-w-4xl w-full mx-auto">
                {collaborativeBlocks.length === 0 && syncCompleted && (
                    <div className="text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                            <FileText className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Start writing your document</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                            Add your first AST block below. Every keystroke is synchronized across all collaborators via CRDT conflict resolution.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => handleAddBlock("heading", "Technical Architecture Overview")}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                            >
                                <Plus className="w-4 h-4" /> Add Heading
                            </button>
                            <button
                                onClick={() => handleAddBlock("paragraph", "This document details the system design...")}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition"
                            >
                                <Plus className="w-4 h-4" /> Add Paragraph
                            </button>
                        </div>
                    </div>
                )}

                {/* Collaborative Blocks */}
                {collaborativeBlocks.length > 0 && (
                    <div className="space-y-4">
                        {collaborativeBlocks.map((block) => (
                            <BlockRenderer
                                key={block._id}
                                block={block}
                                onBlockContentChange={handleBlockContentChange}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* AST Inspector Modal */}
            <ASTInspectorModal
                isOpen={isASTModalOpen}
                onClose={() => setIsASTModalOpen(false)}
                document={{
                    ...document,
                    title: documentTitle,
                    blocks: collaborativeBlocks
                }}
            />
        </div>
    );
};

export default DocumentPage;