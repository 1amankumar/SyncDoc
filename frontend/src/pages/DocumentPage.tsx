import {
    useEffect,
    useState
} from "react";

import type {
    Block,
    Document
} from "../types/document";

import BlockRenderer from "../components/BlockRenderer";

import {
    blocks,
    blockOrder,
    blockTypes,
    addBlock,
    isSyncReady,
    onSyncReady
} from "../services/websocketService";

import {
    useBlockContext
} from "../context/BlockContext";

// ========================================
// Props
// ========================================

interface DocumentPageProps {
    document: Document;
}

// ========================================
// Component
// ========================================

function DocumentPage({
    document
}: DocumentPageProps) {

    // ========================================
    // Collaborative Blocks
    // ========================================

    const [
        collaborativeBlocks,
        setCollaborativeBlocks
    ] = useState<Block[]>([]);

    // ========================================
    // Sync State
    // ========================================

    const [
        syncCompleted,
        setSyncCompleted
    ] = useState<boolean>(
        isSyncReady()
    );

    // ========================================
    // Block Context
    // ========================================

    useBlockContext();

    // ========================================
    // Build Blocks From Yjs
    // ========================================

    useEffect(() => {

        const rebuildBlocks = () => {

            const newBlocks: Block[] = [];

            // --------------------------------
            // Read block order
            // --------------------------------

            const orderedBlockIds =
                blockOrder.toArray();

            orderedBlockIds.forEach(
                (blockId) => {

                    // ----------------------------
                    // Get shared text
                    // ----------------------------

                    const sharedText =
                        blocks.get(
                            blockId
                        );

                    if (!sharedText) {
                        return;
                    }

                    // ----------------------------
                    // Get block type
                    // ----------------------------

                    const blockType =
                        blockTypes.get(
                            blockId
                        );

                    // ----------------------------
                    // Create React block
                    // ----------------------------

                    newBlocks.push({
                        _id: blockId,

                        type:
                            blockType ??
                            "paragraph",

                        content:
                            sharedText.toString(),

                        children: []
                    });
                }
            );

            // ====================================
            // Fallback for existing MongoDB blocks
            // ====================================

            if (
                newBlocks.length === 0 &&
                document.blocks.length > 0
            ) {

                setCollaborativeBlocks(
                    document.blocks
                );

                return;
            }

            // ====================================
            // Update React State
            // ====================================

            setCollaborativeBlocks(
                newBlocks
            );
        };

        // ========================================
        // Initial Build
        // ========================================

        rebuildBlocks();

        // ========================================
        // Observe Block Order
        // ========================================

        blockOrder.observe(
            rebuildBlocks
        );

        // ========================================
        // Observe Block Types
        // ========================================

        blockTypes.observe(
            rebuildBlocks
        );

        // ========================================
        // Observe Block Map
        // ========================================

        blocks.observe(
            rebuildBlocks
        );

        // ========================================
        // Cleanup
        // ========================================

        return () => {

            blockOrder.unobserve(
                rebuildBlocks
            );

            blockTypes.unobserve(
                rebuildBlocks
            );

            blocks.unobserve(
                rebuildBlocks
            );
        };

    }, [
        document.blocks
    ]);

    // ========================================
    // Sync Ready
    // ========================================

    useEffect(() => {

        // ----------------------------------------
        // Check immediately
        // ----------------------------------------

        if (
            isSyncReady()
        ) {

            setSyncCompleted(
                true
            );

            return;
        }

        // ----------------------------------------
        // Listen for sync event
        // ----------------------------------------

        const removeListener =
            onSyncReady(() => {

                console.log(
                    "DocumentPage: Sync completed"
                );

                setSyncCompleted(
                    true
                );
            });

        // ----------------------------------------
        // Safety check
        //
        // This handles the case where the WebSocket
        // becomes ready between render and effect.
        // ----------------------------------------

        const syncCheck =
            window.setInterval(() => {

                if (
                    isSyncReady()
                ) {

                    setSyncCompleted(
                        true
                    );

                    window.clearInterval(
                        syncCheck
                    );
                }

            }, 100);

        // ========================================
        // Cleanup
        // ========================================

        return () => {

            removeListener();

            window.clearInterval(
                syncCheck
            );
        };

    }, [document._id]);

    // ========================================
    // Handle Block Content Change
    // ========================================

    const handleBlockContentChange = (
        blockId: string,
        content: string
    ): void => {

        setCollaborativeBlocks(
            (currentBlocks) =>
                currentBlocks.map(
                    (block) => {

                        if (
                            block._id !==
                            blockId
                        ) {
                            return block;
                        }

                        return {
                            ...block,
                            content
                        };
                    }
                )
        );
    };

    // ========================================
    // Add New Block
    // ========================================

    const handleAddBlock = (
        type: Block["type"]
    ): void => {

        if (
            !syncCompleted
        ) {

            console.warn(
                "Cannot add block before synchronization is complete."
            );

            return;
        }

        const blockId =
            addBlock(
                type
            );

        if (
            blockId
        ) {

            console.log(
                "New block created:",
                blockId,
                type
            );
        }
    };

    // ========================================
    // Render
    // ========================================

    return (
        <div
            className="
                min-h-[400px]
                bg-white
            "
        >

            {/* ================================== */}
            {/* Editor Header */}
            {/* ================================== */}

            <div
                className="
                    border-b
                    border-slate-200
                    px-6
                    py-5
                "
            >

                <div
                    className="
                        flex
                        items-start
                        justify-between
                        gap-4
                    "
                >

                    {/* Document Information */}

                    <div>

                        <p
                            className="
                                text-xs
                                font-semibold
                                uppercase
                                tracking-wider
                                text-indigo-600
                            "
                        >
                            SyncDoc Editor
                        </p>

                        <h2
                            className="
                                mt-1
                                text-lg
                                font-bold
                                text-slate-900
                            "
                        >
                            {document.title}
                        </h2>

                        <p
                            className="
                                mt-1
                                text-xs
                                text-slate-500
                            "
                        >
                            Live collaboration enabled
                        </p>

                    </div>

                    {/* Sync Status */}

                    <div>

                        {syncCompleted ? (
                            <span
                                className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-full
                                    bg-emerald-50
                                    px-3
                                    py-1.5
                                    text-xs
                                    font-semibold
                                    text-emerald-700
                                "
                            >
                                <span
                                    className="
                                        h-2
                                        w-2
                                        rounded-full
                                        bg-emerald-500
                                    "
                                />

                                Synced
                            </span>
                        ) : (
                            <span
                                className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-full
                                    bg-amber-50
                                    px-3
                                    py-1.5
                                    text-xs
                                    font-semibold
                                    text-amber-700
                                "
                            >
                                <span
                                    className="
                                        h-2
                                        w-2
                                        animate-pulse
                                        rounded-full
                                        bg-amber-500
                                    "
                                />

                                Syncing
                            </span>
                        )}

                    </div>

                </div>

            </div>

            {/* ================================== */}
            {/* Add Block Toolbar */}
            {/* ================================== */}

            <div
                className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                    border-b
                    border-slate-200
                    px-6
                    py-3
                "
            >

                <span
                    className="
                        mr-2
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-slate-400
                    "
                >
                    Add Block
                </span>

                {/* Paragraph */}

                <button
                    type="button"
                    disabled={!syncCompleted}
                    onClick={() =>
                        handleAddBlock(
                            "paragraph"
                        )
                    }
                    className="
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-slate-700
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    + Paragraph
                </button>

                {/* Heading */}

                <button
                    type="button"
                    disabled={!syncCompleted}
                    onClick={() =>
                        handleAddBlock(
                            "heading"
                        )
                    }
                    className="
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-slate-700
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    + Heading
                </button>

                {/* Code */}

                <button
                    type="button"
                    disabled={!syncCompleted}
                    onClick={() =>
                        handleAddBlock(
                            "code"
                        )
                    }
                    className="
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-slate-700
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    + Code
                </button>

            </div>

            {/* ================================== */}
            {/* Editor Content */}
            {/* ================================== */}

            <div
                className="
                    px-6
                    py-5
                "
            >

                {/* -------------------------------- */}
                {/* Still Synchronizing */}
                {/* -------------------------------- */}

                {!syncCompleted && (
                    <div
                        className="
                            rounded-xl
                            border
                            border-amber-200
                            bg-amber-50
                            px-4
                            py-4
                            text-sm
                            text-amber-700
                        "
                    >
                        Synchronizing collaborative document...
                    </div>
                )}

                {/* -------------------------------- */}
                {/* Synced Editor */}
                {/* -------------------------------- */}

                {syncCompleted && (
                    <>
                        {/* ================================ */}
                        {/* Empty Document */}
                        {/* ================================ */}

                        {collaborativeBlocks.length === 0 && (
                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-dashed
                                    border-slate-300
                                    bg-slate-50
                                    px-6
                                    py-14
                                    text-center
                                "
                            >

                                <div
                                    className="
                                        mx-auto
                                        flex
                                        h-14
                                        w-14
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-white
                                        text-2xl
                                        shadow-sm
                                    "
                                >
                                    📝
                                </div>

                                <h3
                                    className="
                                        mt-4
                                        text-base
                                        font-semibold
                                        text-slate-900
                                    "
                                >
                                    Empty document
                                </h3>

                                <p
                                    className="
                                        mx-auto
                                        mt-2
                                        max-w-md
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Start writing by adding a
                                    paragraph, heading, or code block.
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleAddBlock(
                                            "paragraph"
                                        )
                                    }
                                    className="
                                        mt-5
                                        rounded-lg
                                        bg-slate-900
                                        px-4
                                        py-2
                                        text-xs
                                        font-semibold
                                        text-white
                                        transition
                                        hover:bg-slate-700
                                    "
                                >
                                    Add your first block
                                </button>

                            </div>
                        )}

                        {/* ================================ */}
                        {/* Blocks */}
                        {/* ================================ */}

                        {collaborativeBlocks.length > 0 && (
                            <div
                                className="
                                    space-y-4
                                "
                            >

                                {collaborativeBlocks.map(
                                    (block) => (
                                        <BlockRenderer
                                            key={
                                                block._id
                                            }
                                            block={
                                                block
                                            }
                                            onBlockContentChange={
                                                handleBlockContentChange
                                            }
                                        />
                                    )
                                )}

                            </div>
                        )}

                    </>
                )}

            </div>

        </div>
    );
}

export default DocumentPage;