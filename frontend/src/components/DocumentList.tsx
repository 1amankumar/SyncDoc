import React, { useCallback, useEffect, useState, useRef } from "react";
import type { Document } from "../types/document";
import {
    getDocuments,
    createDocument,
    deleteDocument,
    exportDocument
} from "../services/documentService";
import DocumentPage from "../pages/DocumentPage";
import {
    connectToDocument,
    disconnectFromDocument,
    setUserId
} from "../services/websocketService";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, type CurrentUser } from "../services/authService";
import { useToast } from "../context/ToastContext";
import {
    FileText,
    Plus,
    Search,
    FileDown,
    Trash2,
    ArrowLeft,
    Sparkles,
    Layers,
    Clock,
    Grid,
    List,
    Code2,
    Shield,
    X,
    Loader2
} from "lucide-react";

function DocumentList() {
    const navigate = useNavigate();
    const toast = useToast();
    const documentChannel = useRef<BroadcastChannel | null>(null);

    const [user, setUser] = useState<CurrentUser | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterTab, setFilterTab] = useState<"all" | "recent" | "code">("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<"blank" | "rfc" | "api" | "meeting">("blank");
    const [isCreating, setIsCreating] = useState(false);

    // Delete Modal State
    const [docToDelete, setDocToDelete] = useState<Document | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load Documents
    const loadDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                navigate("/login", { replace: true });
                return;
            }
            setUser(currentUser);
            setUserId(currentUser._id);

            const data = await getDocuments();
            setDocuments(data);
        } catch (error) {
            console.error("Failed to load documents:", error);
            if (error instanceof Error && error.message === "UNAUTHORIZED") {
                navigate("/login", { replace: true });
                return;
            }
            toast.error("Failed to load", "Could not fetch your document list.");
        } finally {
            setLoading(false);
        }
    }, [navigate, toast]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    // Broadcast Channel for Multi-tab sync
    useEffect(() => {
        const channel = new BroadcastChannel("syncdoc-documents");
        documentChannel.current = channel;

        channel.onmessage = (event) => {
            if (event.data?.type === "document-created" && event.data.document?._id) {
                const newDoc = event.data.document;
                setDocuments((prev) => {
                    if (prev.some((d) => d._id === newDoc._id)) return prev;
                    return [newDoc, ...prev];
                });
            }
        };

        return () => {
            channel.close();
            documentChannel.current = null;
        };
    }, []);

    // Open Document in Editor
    const handleOpenDocument = (doc: Document) => {
        setSelectedDocument(doc);
        connectToDocument(doc._id, doc.blocks);
    };

    // Close Document
    const handleCloseDocument = () => {
        disconnectFromDocument();
        setSelectedDocument(null);
        loadDocuments();
    };

    // Export PDF directly
    const handleQuickExport = async (e: React.MouseEvent, doc: Document) => {
        e.stopPropagation();
        try {
            toast.info("Preparing PDF", `Compiling ${doc.title}...`);
            const blob = await exportDocument(doc._id);
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement("a");
            a.href = url;
            a.download = `${doc.title.replace(/\s+/g, "_")}.pdf`;
            window.document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            window.document.body.removeChild(a);
            toast.success("PDF Downloaded", `${doc.title} compiled successfully.`);
        } catch (error) {
            console.error("Quick export failed:", error);
            toast.error("Export Failed", "Could not export PDF.");
        }
    };

    // Template Definitions
    const templates = {
        blank: {
            title: "Blank Document",
            description: "Start clean with an empty collaborative canvas.",
            blocks: []
        },
        rfc: {
            title: "Technical RFC / System Design",
            description: "Structured spec with architecture sections and code blocks.",
            blocks: [
                {
                    _id: crypto.randomUUID(),
                    type: "heading",
                    content: "System Architecture & RFC Specification",
                    children: []
                },
                {
                    _id: crypto.randomUUID(),
                    type: "paragraph",
                    content: "This technical specification outlines the design goals, CRDT synchronization guarantees, and AST data schemas for the proposed service.",
                    children: []
                },
                {
                    _id: crypto.randomUUID(),
                    type: "code",
                    content: "// Conflict-free Replicated Data Type (CRDT) Vector Matrix\ninterface ASTNode {\n  id: string;\n  type: 'heading' | 'paragraph' | 'code';\n  versionVector: Map<string, number>;\n}",
                    children: []
                }
            ]
        },
        api: {
            title: "API Documentation",
            description: "Endpoints, request/response models, and status codes.",
            blocks: [
                {
                    _id: crypto.randomUUID(),
                    type: "heading",
                    content: "REST & WebSocket API Reference",
                    children: []
                },
                {
                    _id: crypto.randomUUID(),
                    type: "paragraph",
                    content: "The API gateway uses JWT authentication and WebSocket channels on port 5001 for real-time binary transport.",
                    children: []
                },
                {
                    _id: crypto.randomUUID(),
                    type: "code",
                    content: "POST /api/documents\nGET /api/documents/:id\nGET /api/documents/:id/export",
                    children: []
                }
            ]
        },
        meeting: {
            title: "Sprint Retrospective & Notes",
            description: "Action items, milestones, and collaborative notes.",
            blocks: [
                {
                    _id: crypto.randomUUID(),
                    type: "heading",
                    content: "Sprint Planning & Retrospective",
                    children: []
                },
                {
                    _id: crypto.randomUUID(),
                    type: "paragraph",
                    content: "Key objectives: 1. Deploy CRDT Yjs matrix. 2. Verify sub-5ms query times. 3. Validate zero-overwrite merging.",
                    children: []
                }
            ]
        }
    };

    // Handle Create Document
    const handleCreateDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = newDocTitle.trim();
        if (!title) return;

        try {
            setIsCreating(true);
            const template = templates[selectedTemplate];
            const newDoc = await createDocument(title, template.blocks);

            setDocuments((prev) => [newDoc, ...prev]);
            setShowCreateModal(false);
            setNewDocTitle("");
            toast.success("Document Created", `"${newDoc.title}" is ready for collaboration.`);

            if (documentChannel.current) {
                documentChannel.current.postMessage({
                    type: "document-created",
                    document: newDoc
                });
            }

            handleOpenDocument(newDoc);
        } catch (error) {
            console.error("Failed to create document:", error);
            toast.error("Creation Failed", "Could not create document.");
        } finally {
            setIsCreating(false);
        }
    };

    // Handle Delete Document
    const handleConfirmDelete = async () => {
        if (!docToDelete) return;
        try {
            setIsDeleting(true);
            await deleteDocument(docToDelete._id);
            setDocuments((prev) => prev.filter((d) => d._id !== docToDelete._id));
            if (selectedDocument?._id === docToDelete._id) {
                setSelectedDocument(null);
            }
            toast.success("Deleted", `Document "${docToDelete.title}" was removed.`);
            setDocToDelete(null);
        } catch (error) {
            console.error("Failed to delete document:", error);
            toast.error("Delete Failed", "Could not delete document.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter and search
    const filteredDocs = documents.filter((doc) => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase().trim());
        if (!matchesSearch) return false;
        if (filterTab === "code") {
            return doc.blocks?.some((b) => b.type === "code");
        }
        return true;
    });

    // If a document is currently active, render full editor workspace
    if (selectedDocument) {
        return (
            <div className="p-6 max-w-7xl mx-auto space-y-4">
                {/* Navigation Breadcrumb Bar */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleCloseDocument}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Documents
                    </button>
                    <div className="text-xs text-slate-400 font-medium">
                        Editing as <strong className="text-slate-700">{user?.name || "Collaborator"}</strong>
                    </div>
                </div>

                <DocumentPage document={selectedDocument} onBack={handleCloseDocument} />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
            {/* Top Greeting & Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                            SyncDoc Engine
                        </span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                        Welcome back, {user?.name || "Engineer"}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Real-time collaborative document engine with AST conflict resolution.
                    </p>
                </div>

                {/* Primary Action Button */}
                <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-200 hover:shadow-lg transition"
                >
                    <Plus className="w-4 h-4" />
                    New Document
                </button>
            </div>

            {/* Architecture Highlights & Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Documents</p>
                        <p className="text-xl font-bold text-slate-900">{documents.length}</p>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Conflict Engine</p>
                        <p className="text-sm font-bold text-emerald-600">CRDT Matrix Active</p>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Data Schema</p>
                        <p className="text-sm font-bold text-violet-600">Recursive AST Tree</p>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Export Pipeline</p>
                        <p className="text-sm font-bold text-amber-600">PDF / HTML Ready</p>
                    </div>
                </div>
            </div>

            {/* Filter, Search & View Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search documents by title..."
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setFilterTab("all")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                            filterTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                        All ({documents.length})
                    </button>
                    <button
                        onClick={() => setFilterTab("code")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                            filterTab === "code" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                        Tech Specs
                    </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border-l pl-3 border-slate-200">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-lg transition ${
                            viewMode === "grid" ? "bg-slate-200 text-slate-900" : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        <Grid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded-lg transition ${
                            viewMode === "list" ? "bg-slate-200 text-slate-900" : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Document Cards Container */}
            {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-xs text-slate-500 font-medium">Loading collaborative workspaces...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white p-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No documents found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                        {searchTerm ? "No documents match your search query." : "Create your first collaborative document to get started."}
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
                    >
                        <Plus className="w-4 h-4" /> Create Document
                    </button>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredDocs.map((doc) => {
                        const hasCode = doc.blocks?.some((b) => b.type === "code");
                        const firstPreview = doc.blocks?.find((b) => b.content?.trim())?.content || "No content yet...";

                        return (
                            <div
                                key={doc._id}
                                onClick={() => handleOpenDocument(doc)}
                                className="group relative bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                            >
                                <div>
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 transition">
                                            {hasCode ? <Code2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                {doc.blocks?.length || 0} blocks
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                                        {doc.title}
                                    </h3>

                                    {/* Snippet Preview */}
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                                        {firstPreview}
                                    </p>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        AST Ready
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={(e) => handleQuickExport(e, doc)}
                                            title="Export PDF"
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                        >
                                            <FileDown className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDocToDelete(doc);
                                            }}
                                            title="Delete Document"
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
                    {filteredDocs.map((doc) => (
                        <div
                            key={doc._id}
                            onClick={() => handleOpenDocument(doc)}
                            className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 cursor-pointer transition"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 truncate">{doc.title}</h4>
                                    <p className="text-xs text-slate-400 truncate">
                                        {doc.blocks?.length || 0} AST nodes • Live collaboration enabled
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => handleQuickExport(e, doc)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                >
                                    <FileDown className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDocToDelete(doc);
                                    }}
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Document Modal with Templates */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Create New Document</h3>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDocument} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Document Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newDocTitle}
                                    onChange={(e) => setNewDocTitle(e.target.value)}
                                    placeholder="e.g. Distributed Database Spec v2"
                                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition"
                                    autoFocus
                                />
                            </div>

                            {/* Template Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Select Starter Template
                                </label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {(Object.keys(templates) as Array<keyof typeof templates>).map((key) => {
                                        const t = templates[key];
                                        const isSelected = selectedTemplate === key;
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => setSelectedTemplate(key)}
                                                className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                                                    isSelected
                                                        ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                                                        : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                                                }`}
                                            >
                                                <p className="text-xs font-bold text-slate-900">{t.title}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                                    {t.description}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Create Document
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {docToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Delete Document</h3>
                                <p className="text-xs text-slate-500">This action cannot be undone.</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            Are you sure you want to delete <strong>"{docToDelete.title}"</strong> and all its structural AST nodes?
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDocToDelete(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Delete Document
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DocumentList;