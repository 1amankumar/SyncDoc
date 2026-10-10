import React, { useEffect, useState, useRef, useCallback } from "react";
import type { Block } from "../types/document";
import {
    ydoc,
    blocks,
    blockLocks,
    getUserId,
    isSyncReady,
    requestBlockLock,
    releaseBlockLock,
    getRemoteCursors,
    getCollaborators,
    sendCursorPosition,
    requestDeleteBlock,
    onDeleteRequest,
    approveDeleteRequest,
    rejectDeleteRequest,
    updateBlockType,
    moveBlock,
    insertBlockAfter,
    type DeleteRequest
} from "../services/websocketService";
import { useBlockContext } from "../context/BlockContext";
import { useToast } from "../context/ToastContext";
import * as Y from "yjs";
import {
    Lock,
    Unlock,
    Trash2,
    ChevronUp,
    ChevronDown,
    Plus,
    Copy,
    Check,
    AlertCircle,
    Heading1,
    Heading2,
    Heading3,
    FileText,
    Code,
    Quote
} from "lucide-react";

interface BlockRendererProps {
    block: Block;
    onBlockContentChange: (blockId: string, content: string) => void;
}

const BlockRenderer: React.FC<BlockRendererProps> = ({
    block,
    onBlockContentChange
}) => {
    const {
        activeBlockId,
        cursorPosition,
        selectionStart,
        selectionEnd,
        setActiveBlockId,
        setSelectedBlockId,
        setCursorPosition,
        setSelectionStart,
        setSelectionEnd
    } = useBlockContext();

    const toast = useToast();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [content, setContent] = useState<string>(block.content || "");
    const [lockOwner, setLockOwner] = useState<string | null>(
        blockLocks.get(block._id) ?? null
    );
    const [remoteCursors, setRemoteCursors] = useState(getRemoteCursors());
    const [collaboratorState, setCollaboratorState] = useState(getCollaborators());
    const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showTypeMenu, setShowTypeMenu] = useState(false);

    const currentUserId = getUserId();
    const isActive = activeBlockId === block._id;
    const isLockedByAnotherUser = Boolean(lockOwner && lockOwner !== currentUserId);
    const isOwnedByCurrentUser = Boolean(lockOwner && lockOwner === currentUserId);

    // Auto-resize textarea height
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(textarea.scrollHeight, block.type === "code" ? 70 : 40)}px`;
    }, [block.type]);

    useEffect(() => {
        adjustTextareaHeight();
    }, [content, adjustTextareaHeight]);

    // Get Collaborator Name
    const getCollaboratorName = (remoteUserId: string): string => {
        const collaborator = collaboratorState.users.find((u) => u.id === remoteUserId);
        return collaborator?.name ?? `User ${remoteUserId.slice(0, 5)}`;
    };

    // Listen to remote cursor updates
    useEffect(() => {
        const handleCursorUpdate = () => {
            setRemoteCursors(getRemoteCursors());
        };
        window.addEventListener("syncdoc-cursor-update", handleCursorUpdate);
        return () => {
            window.removeEventListener("syncdoc-cursor-update", handleCursorUpdate);
        };
    }, []);

    // Listen to collaborator updates
    useEffect(() => {
        const handleCollaboratorUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            setCollaboratorState(customEvent.detail);
        };
        window.addEventListener("syncdoc-collaborators", handleCollaboratorUpdate);
        return () => {
            window.removeEventListener("syncdoc-collaborators", handleCollaboratorUpdate);
        };
    }, []);

    // Listen to lock updates from Yjs
    useEffect(() => {
        const handleLocks = () => {
            const owner = blockLocks.get(block._id) ?? null;
            setLockOwner(owner);
        };
        blockLocks.observe(handleLocks);
        return () => {
            blockLocks.unobserve(handleLocks);
        };
    }, [block._id]);

    // Listen to incoming Delete Requests
    useEffect(() => {
        const removeListener = onDeleteRequest((request) => {
            if (request.blockId === block._id) {
                setDeleteRequest(request);
            }
        });
        return removeListener;
    }, [block._id]);

    // Send Local Cursor Position
    useEffect(() => {
        if (!isActive) return;
        sendCursorPosition(
            block._id,
            cursorPosition,
            selectionStart,
            selectionEnd
        );
    }, [block._id, isActive, cursorPosition, selectionStart, selectionEnd]);

    // Yjs Text Synchronization
    useEffect(() => {
        let currentText: Y.Text | null = null;

        const handleTextChange = () => {
            if (!currentText) return;
            const newContent = currentText.toString();
            setContent(newContent);
            onBlockContentChange(block._id, newContent);
        };

        const attachTextObserver = () => {
            const sharedText = blocks.get(block._id);
            if (!sharedText) return;

            if (currentText) {
                currentText.unobserve(handleTextChange);
            }

            currentText = sharedText;
            const textContent = sharedText.toString();
            setContent(textContent);
            sharedText.observe(handleTextChange);
        };

        attachTextObserver();
        blocks.observe(attachTextObserver);

        return () => {
            if (currentText) {
                currentText.unobserve(handleTextChange);
            }
            blocks.unobserve(attachTextObserver);
        };
    }, [block._id, onBlockContentChange]);

    // Handle Textarea Focus -> Request Lock
    const handleFocus = () => {
        const userId = getUserId();
        if (!userId) return;

        setActiveBlockId(block._id);
        setSelectedBlockId(block._id);

        const existingOwner = blockLocks.get(block._id);
        if (existingOwner && existingOwner !== userId) {
            return;
        }

        if (existingOwner === userId) {
            return;
        }

        requestBlockLock(block._id);
    };

    // Handle Cursor and Selection
    const updateCursorState = (target: HTMLTextAreaElement) => {
        setCursorPosition(target.selectionStart);
        setSelectionStart(target.selectionStart);
        setSelectionEnd(target.selectionEnd);
    };

    // Handle Character-Level Diffing for CRDT
    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = event.target.value;
        const userId = getUserId();
        if (!userId) return;

        const existingOwner = blockLocks.get(block._id);
        if (existingOwner && existingOwner !== userId) {
            return;
        }

        const sharedText = blocks.get(block._id);
        if (!sharedText) return;

        // Calculate diff
        let start = 0;
        while (
            start < content.length &&
            start < newContent.length &&
            content[start] === newContent[start]
        ) {
            start++;
        }

        let oldEnd = content.length;
        let newEnd = newContent.length;
        while (
            oldEnd > start &&
            newEnd > start &&
            content[oldEnd - 1] === newContent[newEnd - 1]
        ) {
            oldEnd--;
            newEnd--;
        }

        const deleteLength = oldEnd - start;
        const insertedText = newContent.slice(start, newEnd);

        ydoc.transact(() => {
            if (deleteLength > 0) {
                sharedText.delete(start, deleteLength);
            }
            if (insertedText.length > 0) {
                sharedText.insert(start, insertedText);
            }
        });

        setContent(newContent);
        onBlockContentChange(block._id, newContent);
        updateCursorState(event.target);
    };

    // Block Lock / Unlock Actions
    const handleUnlock = () => {
        releaseBlockLock(block._id);
        toast.info("Lock released", "Block is now available for other collaborators");
    };

    // Delete Block
    const handleDelete = () => {
        const userId = getUserId();
        if (!userId) return;

        const existingOwner = blockLocks.get(block._id);
        if (existingOwner && existingOwner !== userId) {
            requestDeleteBlock(block._id);
            toast.warning(
                "Delete request sent",
                `Waiting for ${getCollaboratorName(existingOwner)} to approve deletion.`
            );
            return;
        }

        requestDeleteBlock(block._id);
    };

    // Approve / Reject Delete Request
    const handleApproveDelete = () => {
        if (!deleteRequest) return;
        approveDeleteRequest(deleteRequest.requestId);
        setDeleteRequest(null);
        toast.success("Deletion approved", "Block has been removed.");
    };

    const handleRejectDelete = () => {
        if (!deleteRequest) return;
        rejectDeleteRequest(deleteRequest.requestId);
        setDeleteRequest(null);
        toast.info("Deletion rejected", "Block delete request was declined.");
    };

    // Change Block Type
    const handleChangeType = (newType: Block["type"]) => {
        updateBlockType(block._id, newType);
        setShowTypeMenu(false);
        toast.success("Block updated", `Converted to ${newType}`);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(content);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // Remote cursors on this block
    const blockRemoteCursors = remoteCursors.filter((c) => c.blockId === block._id);

    // Type icon & style config
    const typeConfigs: Record<
        string,
        { icon: React.ReactNode; label: string; textClass: string; containerClass: string }
    > = {
        heading: {
            icon: <Heading1 className="w-3.5 h-3.5" />,
            label: "Heading 1",
            textClass: "text-2xl font-bold text-slate-900 tracking-tight",
            containerClass: "border-slate-200"
        },
        heading2: {
            icon: <Heading2 className="w-3.5 h-3.5" />,
            label: "Heading 2",
            textClass: "text-xl font-bold text-slate-800 tracking-tight",
            containerClass: "border-slate-200"
        },
        heading3: {
            icon: <Heading3 className="w-3.5 h-3.5" />,
            label: "Heading 3",
            textClass: "text-lg font-semibold text-slate-800",
            containerClass: "border-slate-200"
        },
        paragraph: {
            icon: <FileText className="w-3.5 h-3.5" />,
            label: "Paragraph",
            textClass: "text-base text-slate-700 leading-relaxed",
            containerClass: "border-slate-200"
        },
        code: {
            icon: <Code className="w-3.5 h-3.5" />,
            label: "Code",
            textClass: "font-mono text-sm text-emerald-400 bg-slate-900",
            containerClass: "bg-slate-900 border-slate-800 shadow-inner"
        },
        quote: {
            icon: <Quote className="w-3.5 h-3.5" />,
            label: "Quote",
            textClass: "italic text-slate-700 text-base",
            containerClass: "border-l-4 border-indigo-500 bg-indigo-50/30"
        }
    };

    const currentConfig = typeConfigs[block.type] || typeConfigs.paragraph;

    return (
        <div className="group relative transition-all duration-200">
            {/* Delete Request Incoming Banner */}
            {deleteRequest && isOwnedByCurrentUser && (
                <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-medium text-amber-900">
                            <strong>{getCollaboratorName(deleteRequest.requesterId)}</strong> requested to delete this block.
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleApproveDelete}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-sm"
                        >
                            Approve Delete
                        </button>
                        <button
                            onClick={handleRejectDelete}
                            className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {/* Block Card Container */}
            <div
                className={`relative rounded-xl border transition-all duration-200 ${
                    block.type === "code"
                        ? "bg-slate-900 border-slate-800"
                        : "bg-white border-slate-200/90 hover:border-slate-300"
                } ${
                    isOwnedByCurrentUser
                        ? "ring-2 ring-emerald-400/80 shadow-sm"
                        : isLockedByAnotherUser
                        ? "ring-2 ring-rose-400/80 bg-rose-50/20"
                        : isActive
                        ? "ring-2 ring-indigo-400/60 shadow-sm"
                        : ""
                }`}
            >
                {/* Block Header / Action Controls */}
                <div
                    className={`flex items-center justify-between px-3.5 py-2 border-b text-xs ${
                        block.type === "code"
                            ? "border-slate-800/80 bg-slate-950/40 text-slate-400"
                            : "border-slate-100 bg-slate-50/60 text-slate-500"
                    }`}
                >
                    {/* Left: Type Switcher & Handle */}
                    <div className="flex items-center gap-2">
                        {/* Type Switcher Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowTypeMenu(!showTypeMenu)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium transition ${
                                    block.type === "code"
                                        ? "hover:bg-slate-800 text-slate-300"
                                        : "hover:bg-slate-200/70 text-slate-700"
                                }`}
                            >
                                {currentConfig.icon}
                                <span className="capitalize">{currentConfig.label}</span>
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                            </button>

                            {showTypeMenu && (
                                <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95">
                                    <button
                                        onClick={() => handleChangeType("paragraph")}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-slate-500" /> Paragraph
                                    </button>
                                    <button
                                        onClick={() => handleChangeType("heading")}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition"
                                    >
                                        <Heading1 className="w-3.5 h-3.5 text-slate-500" /> Heading 1
                                    </button>
                                    <button
                                        onClick={() => handleChangeType("code")}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition"
                                    >
                                        <Code className="w-3.5 h-3.5 text-slate-500" /> Code Block
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Move Up / Down */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => moveBlock(block._id, "up")}
                                title="Move up"
                                className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => moveBlock(block._id, "down")}
                                title="Move down"
                                className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition"
                            >
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Right: Lock Status & Quick Actions */}
                    <div className="flex items-center gap-2">
                        {/* Lock State Pill */}
                        {isOwnedByCurrentUser && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold border border-emerald-500/20">
                                <Lock className="w-3 h-3 text-emerald-500" /> Editing
                            </span>
                        )}

                        {isLockedByAnotherUser && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[11px] font-semibold border border-rose-500/20">
                                <Lock className="w-3 h-3 text-rose-500" /> {getCollaboratorName(lockOwner!)}
                            </span>
                        )}

                        {/* Code Block Copy Button */}
                        {block.type === "code" && (
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copiedCode ? "Copied" : "Copy"}
                            </button>
                        )}

                        {/* Release Lock Button */}
                        {isOwnedByCurrentUser && (
                            <button
                                type="button"
                                onClick={handleUnlock}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                                title="Release lock"
                            >
                                <Unlock className="w-3 h-3" /> Unlock
                            </button>
                        )}

                        {/* Delete Block */}
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title={isLockedByAnotherUser ? "Request to delete" : "Delete block"}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Block Content Editor Area */}
                <div className="relative p-4">
                    {/* Locked By Collaborator Overlay */}
                    {isLockedByAnotherUser && (
                        <div className="absolute inset-0 z-20 bg-rose-50/70 backdrop-blur-[1px] rounded-b-xl flex items-center justify-between px-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200">
                                    {getCollaboratorName(lockOwner!).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-rose-900">
                                        Being edited by {getCollaboratorName(lockOwner!)}
                                    </p>
                                    <p className="text-[11px] text-rose-600">
                                        Changes update live. Editing locked to preserve AST tree.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-sm"
                            >
                                Request Delete
                            </button>
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onClick={(e) => updateCursorState(e.currentTarget)}
                        onSelect={(e) => updateCursorState(e.currentTarget)}
                        readOnly={!isSyncReady() || isLockedByAnotherUser}
                        placeholder={
                            block.type === "heading"
                                ? "Heading..."
                                : block.type === "code"
                                ? "// Enter executable code snippet..."
                                : "Type something, or press Enter for a new block..."
                        }
                        rows={1}
                        className={`w-full resize-none border-0 bg-transparent p-0 outline-none transition-colors ${
                            currentConfig.textClass
                        } ${
                            block.type === "code"
                                ? "placeholder:text-slate-600 selection:bg-indigo-900 selection:text-indigo-200"
                                : "placeholder:text-slate-400 selection:bg-indigo-100 selection:text-indigo-900"
                        }`}
                    />

                    {/* Remote Collaborator Cursor Indicators */}
                    {blockRemoteCursors.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
                            {blockRemoteCursors.map((cursor) => (
                                <div
                                    key={cursor.userId}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-semibold animate-pulse"
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                    <span>{getCollaboratorName(cursor.userId)}</span>
                                    <span className="text-slate-400 font-normal">pos: {cursor.cursorPosition}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Add In-Between Button */}
            <div className="h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={() => insertBlockAfter(block._id, "paragraph")}
                    className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-full border border-slate-200 hover:border-indigo-300 shadow-sm transition"
                >
                    <Plus className="w-3 h-3" /> Add Block
                </button>
            </div>
        </div>
    );
};

export default BlockRenderer;