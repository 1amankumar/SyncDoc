import {
    useCallback,
    useEffect,
    useState,
    useRef
} from "react";

import type {
    Document
} from "../types/document";

import {
    getDocuments,
    createDocument,
    exportDocument
} from "../services/documentService";

import DocumentPage from "../pages/DocumentPage";

import {
    connectToDocument,
    setUserId,
    blocks,
    blockOrder
} from "../services/websocketService";

import {
    useNavigate
} from "react-router-dom";

import {
    getCurrentUser
} from "../services/authService";

function DocumentList() {

    const navigate =
        useNavigate();

    const documentChannel =
        useRef<BroadcastChannel | null>(
            null
        );

    // ========================================
    // Documents
    // ========================================

    const [
        documents,
        setDocuments
    ] = useState<Document[]>([]);
    const [
        collaborativeBlockCount,
        setCollaborativeBlockCount
    ] = useState(0);

    // ========================================
    // Selected Document
    // ========================================

    const [
        selectedDocument,
        setSelectedDocument
    ] = useState<Document | null>(null);

    // ========================================
    // Loading
    // ========================================

    const [
        loading,
        setLoading
    ] = useState(true);

    // ========================================
    // Error
    // ========================================

    const [
        error,
        setError
    ] = useState<string | null>(null);

    // ========================================
    // Search
    // ========================================

    const [
        searchTerm,
        setSearchTerm
    ] = useState("");

    // ========================================
    // Create Document
    // ========================================

    const [
        showCreateForm,
        setShowCreateForm
    ] = useState(false);

    const [
        newDocumentTitle,
        setNewDocumentTitle
    ] = useState("");

    const [
        creating,
        setCreating
    ] = useState(false);

    // ========================================
    // Load Documents
    // ========================================

    const loadDocuments =
        useCallback(
            async () => {

                try {

                    setLoading(true);
                    setError(null);

                    // --------------------------------
                    // Get current user
                    // --------------------------------

                    const user =
                        await getCurrentUser();

                    if (!user) {

                        navigate(
                            "/login",
                            {
                                replace: true
                            }
                        );

                        return;
                    }

                    // --------------------------------
                    // Store user ID
                    // --------------------------------

                    setUserId(
                        user._id
                    );

                    // --------------------------------
                    // Fetch latest documents
                    // --------------------------------

                    const data =
                        await getDocuments();

                    setDocuments(
                        data
                    );

                } catch (error) {

                    console.error(
                        "Failed to load documents:",
                        error
                    );

                    // --------------------------------
                    // Unauthorized
                    // --------------------------------

                    if (
                        error instanceof Error &&
                        error.message ===
                        "UNAUTHORIZED"
                    ) {

                        navigate(
                            "/login",
                            {
                                replace: true
                            }
                        );

                        return;
                    }

                    // --------------------------------
                    // Other errors
                    // --------------------------------

                    setError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load documents."
                    );

                } finally {

                    setLoading(false);
                }

            },
            [navigate]
        );


    // ========================================
    // Initial Document Load
    // ========================================

    useEffect(() => {

        loadDocuments();

    }, [
        loadDocuments
    ]);
    useEffect(() => {
        const updateBlockCount = () => {
            setCollaborativeBlockCount(
                blockOrder
                    .toArray()
                    .filter(
                        (blockId) =>
                            blocks.has(blockId)
                    ).length
            );
        };

        updateBlockCount();

        blockOrder.observe(
            updateBlockCount
        );

        blocks.observe(
            updateBlockCount
        );

        return () => {
            blockOrder.unobserve(
                updateBlockCount
            );

            blocks.unobserve(
                updateBlockCount
            );
        };
    }, []);

    useEffect(() => {
        const channel =
            new BroadcastChannel(
                "syncdoc-documents"
            );

        documentChannel.current =
            channel;

        channel.onmessage = (
            event
        ) => {

            if (
                event.data?.type !==
                "document-created"
            ) {
                return;
            }

            const newDocument =
                event.data.document;

            if (!newDocument?._id) {
                return;
            }

            setDocuments(
                (currentDocuments) => {

                    const alreadyExists =
                        currentDocuments.some(
                            (document) =>
                                document._id ===
                                newDocument._id
                        );

                    if (alreadyExists) {
                        return currentDocuments;
                    }

                    return [
                        newDocument,
                        ...currentDocuments
                    ];
                }
            );
        };

        return () => {

            channel.close();

            documentChannel.current =
                null;
        };
    }, []);

    // ========================================
    // Refresh When Browser Tab Becomes Active
    // ========================================

    useEffect(() => {

        // --------------------------------
        // Browser window receives focus
        // --------------------------------





        // --------------------------------
        // Add listeners
        // --------------------------------



        // --------------------------------
        // Cleanup
        // --------------------------------



    }, [
        loadDocuments
    ]);

    // ========================================
    // Filter Documents
    // ========================================

    const filteredDocuments =
        documents.filter(
            (document) =>
                document.title
                    .toLowerCase()
                    .includes(
                        searchTerm
                            .toLowerCase()
                            .trim()
                    )
        );

    // ========================================
    // Open Document
    // ========================================

    const handleOpenDocument = (
        document: Document
    ) => {

        // --------------------------------
        // Select document
        // --------------------------------

        setSelectedDocument(
            document
        );

        // --------------------------------
        // Connect to Yjs/WebSocket
        // --------------------------------

        connectToDocument(
            document._id,
            document.blocks
        );
    };

    // ========================================
    // Create Document
    // ========================================

    const handleCreateDocument = async (
        event: React.FormEvent
    ) => {

        event.preventDefault();

        const title =
            newDocumentTitle.trim();

        if (!title) {
            return;
        }

        try {

            setCreating(true);
            setError(null);

            // --------------------------------
            // Create through backend
            // --------------------------------

            const newDocument =
                await createDocument(
                    title,
                    []
                );

            // --------------------------------
            // Add new document locally
            // --------------------------------

            setDocuments(
                (currentDocuments) => [
                    newDocument,
                    ...currentDocuments
                ]
            );
            documentChannel.current?.postMessage({
                type: "document-created",
                document: newDocument
            });

            // --------------------------------
            // Reset form
            // --------------------------------

            setNewDocumentTitle("");

            setShowCreateForm(
                false
            );

        } catch (error) {

            console.error(
                "Failed to create document:",
                error
            );

            // --------------------------------
            // Unauthorized
            // --------------------------------

            if (
                error instanceof Error &&
                error.message ===
                "UNAUTHORIZED"
            ) {

                navigate(
                    "/login",
                    {
                        replace: true
                    }
                );

                return;
            }

            // --------------------------------
            // Other errors
            // --------------------------------

            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to create document."
            );

        } finally {

            setCreating(false);
        }
    };

    // ========================================
    // Export Document
    // ========================================

    const handleExportDocument =
        async (
            document: Document
        ) => {

            try {

                setError(null);

                // --------------------------------
                // Request PDF
                // --------------------------------

                const blob =
                    await exportDocument(
                        document._id
                    );

                // --------------------------------
                // Create download URL
                // --------------------------------

                const url =
                    window.URL.createObjectURL(
                        blob
                    );

                // --------------------------------
                // Create temporary link
                // --------------------------------

                const link =
                    window.document.createElement(
                        "a"
                    );

                link.href =
                    url;

                link.download =
                    `${document.title}.pdf`;

                window.document.body.appendChild(
                    link
                );

                // --------------------------------
                // Start download
                // --------------------------------

                link.click();

                // --------------------------------
                // Cleanup
                // --------------------------------

                link.remove();

                window.URL.revokeObjectURL(
                    url
                );

            } catch (error) {

                console.error(
                    "Failed to export document:",
                    error
                );

                // --------------------------------
                // Unauthorized
                // --------------------------------

                if (
                    error instanceof Error &&
                    error.message ===
                    "UNAUTHORIZED"
                ) {

                    navigate(
                        "/login",
                        {
                            replace: true
                        }
                    );

                    return;
                }

                // --------------------------------
                // Other errors
                // --------------------------------

                setError(
                    error instanceof Error
                        ? error.message
                        : "Failed to export document."
                );
            }
        };

    // ========================================
    // Loading State
    // ========================================

    if (loading) {

        return (
            <div
                className="
                    min-h-screen
                    bg-slate-50
                    p-6
                "
            >

                <div
                    className="
                        mx-auto
                        max-w-7xl
                    "
                >

                    {/* Header skeleton */}

                    <div
                        className="
                            mb-8
                        "
                    >

                        <div
                            className="
                                h-8
                                w-48
                                animate-pulse
                                rounded-lg
                                bg-slate-200
                            "
                        />

                        <div
                            className="
                                mt-3
                                h-4
                                w-72
                                animate-pulse
                                rounded
                                bg-slate-200
                            "
                        />

                    </div>

                    {/* Search skeleton */}

                    <div
                        className="
                            mb-6
                            h-12
                            w-full
                            animate-pulse
                            rounded-xl
                            bg-slate-200
                        "
                    />

                    {/* Cards skeleton */}

                    <div
                        className="
                            grid
                            gap-5
                            sm:grid-cols-2
                            lg:grid-cols-3
                        "
                    >

                        {[1, 2, 3].map(
                            (item) => (

                                <div
                                    key={item}
                                    className="
                                        h-48
                                        animate-pulse
                                        rounded-2xl
                                        bg-white
                                        shadow-sm
                                    "
                                />

                            )
                        )}

                    </div>

                </div>

            </div>
        );
    }

    // ========================================
    // Error State
    // ========================================

    if (
        error &&
        documents.length === 0
    ) {

        return (
            <div
                className="
                    min-h-screen
                    bg-slate-50
                    p-6
                "
            >

                <div
                    className="
                        mx-auto
                        flex
                        min-h-[70vh]
                        max-w-2xl
                        items-center
                        justify-center
                    "
                >

                    <div
                        className="
                            w-full
                            rounded-2xl
                            border
                            border-red-200
                            bg-white
                            p-8
                            text-center
                            shadow-sm
                        "
                    >

                        <div
                            className="
                                mx-auto
                                mb-4
                                flex
                                h-14
                                w-14
                                items-center
                                justify-center
                                rounded-full
                                bg-red-100
                                text-2xl
                            "
                        >
                            ⚠️
                        </div>

                        <h2
                            className="
                                text-xl
                                font-semibold
                                text-slate-900
                            "
                        >
                            Something went wrong
                        </h2>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-slate-500
                            "
                        >
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                window.location.reload()
                            }
                            className="
                                mt-6
                                rounded-xl
                                bg-slate-900
                                px-5
                                py-2.5
                                text-sm
                                font-medium
                                text-white
                                transition
                                hover:bg-slate-700
                            "
                        >
                            Try again
                        </button>

                    </div>

                </div>

            </div>
        );
    }

    // ========================================
    // Main Render
    // ========================================

    return (
        <div
            className="
                min-h-screen
                bg-slate-50
            "
        >

            <div
                className="
                    mx-auto
                    max-w-7xl
                    px-4
                    py-6
                    sm:px-6
                    lg:px-8
                "
            >

                {/* ========================================
                    HEADER
                ======================================== */}

                <div
                    className="
                        mb-8
                        flex
                        flex-col
                        gap-5
                        lg:flex-row
                        lg:items-center
                        lg:justify-between
                    "
                >

                    <div>

                        <div
                            className="
                                flex
                                items-center
                                gap-3
                            "
                        >

                            <div
                                className="
                                    flex
                                    h-11
                                    w-11
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-slate-900
                                    text-xl
                                    text-white
                                    shadow-sm
                                "
                            >
                                📄
                            </div>

                            <div>

                                <h1
                                    className="
                                        text-2xl
                                        font-bold
                                        tracking-tight
                                        text-slate-900
                                        sm:text-3xl
                                    "
                                >
                                    My Documents
                                </h1>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Create, manage and
                                    collaborate on your
                                    documents.
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* New Document */}

                    <button
                        type="button"
                        onClick={() =>
                            setShowCreateForm(
                                true
                            )
                        }
                        className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-slate-900
                            px-5
                            py-3
                            text-sm
                            font-semibold
                            text-white
                            shadow-sm
                            transition
                            hover:bg-slate-700
                            active:scale-[0.98]
                        "
                    >

                        <span
                            className="
                                text-lg
                            "
                        >
                            +
                        </span>

                        New Document

                    </button>

                </div>

                {/* ========================================
                    SEARCH
                ======================================== */}

                <div
                    className="
                        mb-7
                    "
                >

                    <div
                        className="
                            relative
                        "
                    >

                        <span
                            className="
                                pointer-events-none
                                absolute
                                left-4
                                top-1/2
                                -translate-y-1/2
                                text-lg
                                text-slate-400
                            "
                        >
                            🔍
                        </span>

                        <input
                            type="text"
                            value={
                                searchTerm
                            }
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                            placeholder="
                                Search documents...
                            "
                            className="
                                w-full
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                py-3.5
                                pl-11
                                pr-4
                                text-sm
                                text-slate-900
                                shadow-sm
                                outline-none
                                transition
                                placeholder:text-slate-400
                                focus:border-slate-400
                                focus:ring-2
                                focus:ring-slate-200
                            "
                        />

                    </div>

                </div>

                {/* ========================================
                    ERROR
                ======================================== */}

                {error &&
                    documents.length > 0 && (
                        <div
                            className="
                                mb-6
                                flex
                                items-center
                                justify-between
                                rounded-xl
                                border
                                border-red-200
                                bg-red-50
                                px-4
                                py-3
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-3
                                "
                            >

                                <span>
                                    ⚠️
                                </span>

                                <p
                                    className="
                                        text-sm
                                        text-red-700
                                    "
                                >
                                    {error}
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setError(
                                        null
                                    )
                                }
                                className="
                                    text-sm
                                    font-medium
                                    text-red-600
                                    hover:text-red-800
                                "
                            >
                                Dismiss
                            </button>

                        </div>
                    )}

                {/* ========================================
                    DOCUMENT COUNT
                ======================================== */}

                <div
                    className="
                        mb-4
                        flex
                        items-center
                        justify-between
                    "
                >

                    <p
                        className="
                            text-sm
                            font-medium
                            text-slate-600
                        "
                    >

                        {searchTerm.trim()
                            ? `${filteredDocuments.length} result${filteredDocuments.length !== 1
                                ? "s"
                                : ""
                            }`
                            : `${documents.length} document${documents.length !== 1
                                ? "s"
                                : ""
                            }`}

                    </p>

                    {searchTerm && (

                        <button
                            type="button"
                            onClick={() =>
                                setSearchTerm("")
                            }
                            className="
                                text-sm
                                font-medium
                                text-slate-500
                                hover:text-slate-900
                            "
                        >
                            Clear search
                        </button>

                    )}

                </div>

                {/* ========================================
                    NO DOCUMENTS
                ======================================== */}

                {documents.length === 0 ? (

                    <div
                        className="
                            rounded-2xl
                            border
                            border-dashed
                            border-slate-300
                            bg-white
                            px-6
                            py-16
                            text-center
                        "
                    >

                        <div
                            className="
                                mx-auto
                                mb-5
                                flex
                                h-16
                                w-16
                                items-center
                                justify-center
                                rounded-2xl
                                bg-slate-100
                                text-3xl
                            "
                        >
                            📄
                        </div>

                        <h2
                            className="
                                text-xl
                                font-semibold
                                text-slate-900
                            "
                        >
                            No documents yet
                        </h2>

                        <p
                            className="
                                mx-auto
                                mt-2
                                max-w-md
                                text-sm
                                leading-6
                                text-slate-500
                            "
                        >
                            Create your first
                            SyncDoc document and
                            start working with your
                            collaborative editor.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setShowCreateForm(
                                    true
                                )
                            }
                            className="
                                mt-6
                                rounded-xl
                                bg-slate-900
                                px-5
                                py-3
                                text-sm
                                font-semibold
                                text-white
                                transition
                                hover:bg-slate-700
                            "
                        >
                            Create your first
                            document
                        </button>

                    </div>

                ) : filteredDocuments.length === 0 ? (

                    /* ========================================
                        NO SEARCH RESULTS
                    ======================================== */

                    <div
                        className="
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            px-6
                            py-16
                            text-center
                        "
                    >

                        <div
                            className="
                                mx-auto
                                mb-5
                                flex
                                h-14
                                w-14
                                items-center
                                justify-center
                                rounded-full
                                bg-slate-100
                                text-2xl
                            "
                        >
                            🔍
                        </div>

                        <h2
                            className="
                                text-lg
                                font-semibold
                                text-slate-900
                            "
                        >
                            No documents found
                        </h2>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-slate-500
                            "
                        >
                            Try searching with a
                            different document name.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setSearchTerm("")
                            }
                            className="
                                mt-5
                                rounded-xl
                                border
                                border-slate-200
                                px-4
                                py-2
                                text-sm
                                font-medium
                                text-slate-700
                                transition
                                hover:bg-slate-50
                            "
                        >
                            Clear search
                        </button>

                    </div>

                ) : (

                    /* ========================================
                        DOCUMENT GRID
                    ======================================== */

                    <div
                        className="
                            grid
                            gap-5
                            sm:grid-cols-2
                            lg:grid-cols-3
                            xl:grid-cols-4
                        "
                    >

                        {filteredDocuments.map(
                            (document) => {

                                const isSelected =
                                    selectedDocument?._id ===
                                    document._id;

                                return (

                                    /*
                                     * IMPORTANT:
                                     * This is a DIV, not a BUTTON.
                                     *
                                     * The Export PDF control
                                     * inside it is therefore
                                     * valid HTML.
                                     */

                                    <div
                                        key={
                                            document._id
                                        }
                                        onClick={() =>
                                            handleOpenDocument(
                                                document
                                            )
                                        }
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(
                                            event
                                        ) => {

                                            if (
                                                event.key ===
                                                "Enter" ||
                                                event.key ===
                                                " "
                                            ) {

                                                event.preventDefault();

                                                handleOpenDocument(
                                                    document
                                                );
                                            }
                                        }}
                                        className={`
                                            group
                                            relative
                                            flex
                                            min-h-[210px]
                                            cursor-pointer
                                            flex-col
                                            rounded-2xl
                                            border
                                            bg-white
                                            p-5
                                            text-left
                                            shadow-sm
                                            transition
                                            hover:-translate-y-1
                                            hover:shadow-md
                                            ${isSelected
                                                ? "border-slate-900 ring-2 ring-slate-200"
                                                : "border-slate-200"
                                            }
                                        `}
                                    >

                                        {/* ========================================
                                            TOP ROW
                                        ======================================== */}

                                        <div
                                            className="
                                                flex
                                                items-start
                                                justify-between
                                            "
                                        >

                                            <div
                                                className="
                                                    flex
                                                    h-11
                                                    w-11
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    bg-slate-100
                                                    text-xl
                                                    transition
                                                    group-hover:bg-slate-900
                                                    group-hover:text-white
                                                "
                                            >
                                                📄
                                            </div>

                                            <span
                                                className="
                                                    rounded-full
                                                    bg-emerald-50
                                                    px-2.5
                                                    py-1
                                                    text-xs
                                                    font-medium
                                                    text-emerald-700
                                                "
                                            >
                                                Ready
                                            </span>

                                        </div>

                                        {/* ========================================
                                            TITLE
                                        ======================================== */}

                                        <div
                                            className="
                                                mt-5
                                                flex-1
                                            "
                                        >

                                            <h2
                                                className="
                                                    line-clamp-2
                                                    text-base
                                                    font-semibold
                                                    leading-6
                                                    text-slate-900
                                                "
                                            >
                                                {
                                                    document.title
                                                }
                                            </h2>

                                            <p
                                                className="
                                                    mt-2
                                                    text-sm
                                                    text-slate-500
                                                "
                                            >

                                                {
                                                    selectedDocument?._id === document._id
                                                        ? collaborativeBlockCount
                                                        : document.blocks.length
                                                }{" "}

                                                block
                                                {
                                                    (
                                                        selectedDocument?._id === document._id
                                                            ? collaborativeBlockCount
                                                            : document.blocks.length
                                                    ) !== 1
                                                        ? "s"
                                                        : ""
                                                }

                                            </p>

                                        </div>

                                        {/* ========================================
                                            BOTTOM
                                        ======================================== */}

                                        <div
                                            className="
                                                mt-5
                                                flex
                                                items-center
                                                justify-between
                                                border-t
                                                border-slate-100
                                                pt-4
                                            "
                                        >

                                            <span
                                                className="
                                                    text-xs
                                                    text-slate-400
                                                "
                                            >
                                                Collaborative
                                                document
                                            </span>

                                            <div
                                                className="
                                                    flex
                                                    items-center
                                                    gap-2
                                                "
                                            >

                                                {/* Export PDF */}

                                                <button
                                                    type="button"
                                                    onClick={(
                                                        event
                                                    ) => {

                                                        event.stopPropagation();

                                                        handleExportDocument(
                                                            document
                                                        );
                                                    }}
                                                    className="
                                                        rounded-lg
                                                        border
                                                        border-slate-200
                                                        bg-white
                                                        px-3
                                                        py-1.5
                                                        text-xs
                                                        font-medium
                                                        text-slate-600
                                                        transition
                                                        hover:bg-slate-50
                                                        hover:text-slate-900
                                                    "
                                                >
                                                    Export PDF
                                                </button>

                                                {/* Open */}

                                                <span
                                                    className="
                                                        text-sm
                                                        font-medium
                                                        text-slate-500
                                                        transition
                                                        group-hover:translate-x-1
                                                        group-hover:text-slate-900
                                                    "
                                                >
                                                    Open →
                                                </span>

                                            </div>

                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>
                )}

                {/* ========================================
                    SELECTED DOCUMENT
                ======================================== */}

                {selectedDocument && (

                    <div
                        className="
                            mt-10
                        "
                    >

                        <div
                            className="
                                mb-4
                                flex
                                items-center
                                justify-between
                            "
                        >

                            <div>

                                <p
                                    className="
                                        text-xs
                                        font-semibold
                                        uppercase
                                        tracking-wider
                                        text-slate-400
                                    "
                                >
                                    Active document
                                </p>

                                <h2
                                    className="
                                        mt-1
                                        text-xl
                                        font-bold
                                        text-slate-900
                                    "
                                >
                                    {
                                        selectedDocument.title
                                    }
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedDocument(
                                        null
                                    )
                                }
                                className="
                                    rounded-lg
                                    border
                                    border-slate-200
                                    bg-white
                                    px-3
                                    py-2
                                    text-sm
                                    font-medium
                                    text-slate-600
                                    transition
                                    hover:bg-slate-50
                                    hover:text-slate-900
                                "
                            >
                                Close
                            </button>

                        </div>

                        <div
                            className="
                                overflow-hidden
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                shadow-sm
                            "
                        >

                            <DocumentPage
                                document={
                                    selectedDocument
                                }
                            />

                        </div>

                    </div>
                )}

            </div>

            {/* =====================================================
                CREATE DOCUMENT MODAL
            ===================================================== */}

            {showCreateForm && (

                <div
                    className="
                        fixed
                        inset-0
                        z-50
                        flex
                        items-center
                        justify-center
                        bg-slate-900/50
                        px-4
                        backdrop-blur-sm
                    "
                >

                    {/* Background */}

                    <div
                        className="
                            absolute
                            inset-0
                        "
                        onClick={() => {

                            if (!creating) {

                                setShowCreateForm(
                                    false
                                );
                            }
                        }}
                    />

                    {/* Modal */}

                    <div
                        className="
                            relative
                            w-full
                            max-w-md
                            rounded-2xl
                            bg-white
                            p-6
                            shadow-2xl
                        "
                    >

                        {/* Modal Header */}

                        <div
                            className="
                                mb-6
                                flex
                                items-start
                                justify-between
                            "
                        >

                            <div>

                                <div
                                    className="
                                        mb-3
                                        flex
                                        h-11
                                        w-11
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-slate-100
                                        text-xl
                                    "
                                >
                                    📄
                                </div>

                                <h2
                                    className="
                                        text-xl
                                        font-bold
                                        text-slate-900
                                    "
                                >
                                    Create document
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Give your new document
                                    a title.
                                </p>

                            </div>

                            <button
                                type="button"
                                disabled={creating}
                                onClick={() =>
                                    setShowCreateForm(
                                        false
                                    )
                                }
                                className="
                                    flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-lg
                                    text-xl
                                    text-slate-400
                                    transition
                                    hover:bg-slate-100
                                    hover:text-slate-700
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                ×
                            </button>

                        </div>

                        {/* Create Form */}

                        <form
                            onSubmit={
                                handleCreateDocument
                            }
                        >

                            <label
                                htmlFor="document-title"
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-semibold
                                    text-slate-700
                                "
                            >
                                Document title
                            </label>

                            <input
                                id="document-title"
                                type="text"
                                value={
                                    newDocumentTitle
                                }
                                onChange={(event) =>
                                    setNewDocumentTitle(
                                        event.target.value
                                    )
                                }
                                placeholder="
                                    e.g. Project Documentation
                                "
                                autoFocus
                                disabled={creating}
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    px-4
                                    py-3
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    placeholder:text-slate-400
                                    focus:border-slate-400
                                    focus:ring-2
                                    focus:ring-slate-200
                                    disabled:bg-slate-50
                                "
                            />

                            {/* Buttons */}

                            <div
                                className="
                                    mt-6
                                    flex
                                    gap-3
                                "
                            >

                                <button
                                    type="button"
                                    disabled={creating}
                                    onClick={() => {

                                        setShowCreateForm(
                                            false
                                        );

                                        setNewDocumentTitle(
                                            ""
                                        );
                                    }}
                                    className="
                                        flex-1
                                        rounded-xl
                                        border
                                        border-slate-200
                                        px-4
                                        py-3
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        transition
                                        hover:bg-slate-50
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        creating ||
                                        !newDocumentTitle.trim()
                                    }
                                    className="
                                        flex-1
                                        rounded-xl
                                        bg-slate-900
                                        px-4
                                        py-3
                                        text-sm
                                        font-semibold
                                        text-white
                                        transition
                                        hover:bg-slate-700
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >
                                    {creating
                                        ? "Creating..."
                                        : "Create Document"}
                                </button>
                            </div>
                        </form>

                    </div>

                </div>
            )}

        </div>
    );
}

export default DocumentList;