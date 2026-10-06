import {

    useEffect,

    useState

} from "react";



import type {

    Block

} from "../types/document";



import {

    blocks,

    blockLocks,

    getUserId,

    isSyncReady,

    onSyncReady,

    requestBlockLock,

    releaseBlockLock,

    getRemoteCursors,

    getCollaborators,

    sendCursorPosition,

    requestDeleteBlock,

    onDeleteRequest,

    approveDeleteRequest,

    rejectDeleteRequest,

    type DeleteRequest

} from "../services/websocketService";



import {

    useBlockContext

} from "../context/BlockContext";



import * as Y from "yjs";



// ========================================

// Props

// ========================================



interface BlockRendererProps {

    block: Block;

    onBlockContentChange: (

        blockId: string,

        content: string

    ) => void;

}



// ========================================

// Component

// ========================================



const BlockRenderer = ({

    block,

    onBlockContentChange

}: BlockRendererProps) => {



    // ========================================

    // Block Context

    // ========================================



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



    // ========================================

    // Local State

    // ========================================



    const [

        content,

        setContent

    ] = useState<string>(

        block.content

    );



    const [

        syncCompleted,

        setSyncCompleted

    ] = useState<boolean>(

        isSyncReady()

    );







    // ========================================

    // Lock State

    // ========================================



    const [

        lockOwner,

        setLockOwner

    ] = useState<string | null>(

        blockLocks.get(

            block._id

        ) ?? null

    );



    // ========================================

    // Remote Cursor State

    // ========================================



    const [

        remoteCursors,

        setRemoteCursors

    ] = useState(

        getRemoteCursors()

    );

    // ========================================

    // Collaborator State

    // ========================================

    const [

        collaboratorState,

        setCollaboratorState

    ] = useState(

        getCollaborators()

    );



    // ========================================

    // Delete Permission State

    // ========================================



    const [

        deleteRequest,

        setDeleteRequest

    ] = useState<DeleteRequest | null>(

        null

    );



    // ========================================

    // Current User

    // ========================================



    const currentUserId =

        getUserId();



    // ========================================

    // Get Collaborator Name

    // ========================================



    const getCollaboratorName = (

        remoteUserId: string

    ): string => {



        const collaborator =

            collaboratorState.users.find(

                (user) =>

                    user.id ===

                    remoteUserId

            );



        return (

            collaborator?.name ??

            `User ${remoteUserId.slice(0, 6)}`

        );

    };



    // ========================================

    // Active Block

    // ========================================



    const isActive =

        activeBlockId === block._id;



    // ========================================

    // Lock Status

    // ========================================



    const isLockedByAnotherUser =

        Boolean(

            lockOwner &&

            lockOwner !== currentUserId

        );



    const isOwnedByCurrentUser =

        Boolean(

            lockOwner &&

            lockOwner === currentUserId

        );



    // ========================================

    // Remote Cursors For This Block

    // ========================================



    const blockRemoteCursors =

        remoteCursors.filter(

            (cursor) =>

                cursor.blockId ===

                block._id

        );



    // ========================================

    // Remote Cursor Synchronization

    // ========================================



    useEffect(() => {



        const handleCursorUpdate =

            () => {



                setRemoteCursors(

                    getRemoteCursors()

                );

            };



        window.addEventListener(

            "syncdoc-cursor-update",

            handleCursorUpdate

        );



        return () => {



            window.removeEventListener(

                "syncdoc-cursor-update",

                handleCursorUpdate

            );

        };



    }, []);



    // ========================================

    // Collaborator Synchronization

    // ========================================

    useEffect(() => {



        const handleCollaboratorUpdate =

            (event: Event) => {



                const customEvent =

                    event as CustomEvent;



                setCollaboratorState(

                    customEvent.detail

                );

            };



        window.addEventListener(

            "syncdoc-collaborators",

            handleCollaboratorUpdate

        );



        setCollaboratorState(

            getCollaborators()

        );



        return () => {



            window.removeEventListener(

                "syncdoc-collaborators",

                handleCollaboratorUpdate

            );

        };



    }, []);



    // Delete Permission Request

    // ========================================



    useEffect(() => {



        const removeListener =

            onDeleteRequest(

                (request) => {



                    if (

                        request.blockId !==

                        block._id

                    ) {

                        return;

                    }



                    setDeleteRequest(

                        request

                    );

                }

            );



        return removeListener;



    }, [block._id]);



    // ========================================

    // Send Local Cursor Position

    // ========================================



    useEffect(() => {



        if (!isActive) {

            return;

        }



        sendCursorPosition(

            block._id,

            cursorPosition,

            selectionStart,

            selectionEnd

        );



    }, [

        block._id,

        isActive,

        cursorPosition,

        selectionStart,

        selectionEnd

    ]);



    // ========================================

    // Yjs Text Synchronization

    // ========================================



    useEffect(() => {



        let currentText:

            Y.Text | null = null;



        // ----------------------------------------

        // Handle Y.Text Changes

        // ----------------------------------------



        const handleTextChange =

            () => {



                if (!currentText) {

                    return;

                }



                const newContent =

                    currentText.toString();



                setContent(

                    newContent

                );

            };



        // ----------------------------------------

        // Attach Y.Text Observer

        // ----------------------------------------



        const attachTextObserver =

            () => {



                const sharedText =

                    blocks.get(

                        block._id

                    );



                if (!sharedText) {

                    return;

                }



                // ----------------------------------------

                // Remove Previous Observer

                // ----------------------------------------



                if (currentText) {



                    currentText.unobserve(

                        handleTextChange

                    );

                }



                currentText =

                    sharedText;



                // ----------------------------------------

                // Set Current Content

                // ----------------------------------------



                setContent(

                    sharedText.toString()

                );



                // ----------------------------------------

                // Observe Changes

                // ----------------------------------------



                sharedText.observe(

                    handleTextChange

                );

            };



        // ----------------------------------------

        // Observe Blocks Map

        // ----------------------------------------



        blocks.observe(

            attachTextObserver

        );



        // ----------------------------------------

        // Try Immediately

        // ----------------------------------------



        attachTextObserver();



        // ----------------------------------------

        // Cleanup

        // ----------------------------------------



        return () => {



            blocks.unobserve(

                attachTextObserver

            );



            if (currentText) {



                currentText.unobserve(

                    handleTextChange

                );

            }



            currentText = null;

        };



    }, [block._id]);



    // ========================================

    // Block Lock Synchronization

    // ========================================



    useEffect(() => {



        const updateLockOwner =

            () => {



                const owner =

                    blockLocks.get(

                        block._id

                    ) ?? null;



                setLockOwner(

                    owner

                );

            };



        // ----------------------------------------

        // Initial State

        // ----------------------------------------



        updateLockOwner();



        // ----------------------------------------

        // Observe Lock Changes

        // ----------------------------------------



        blockLocks.observe(

            updateLockOwner

        );



        // ----------------------------------------

        // Cleanup

        // ----------------------------------------



        return () => {



            blockLocks.unobserve(

                updateLockOwner

            );

        };



    }, [block._id]);



    // ========================================

    // Sync Ready

    // ========================================



    useEffect(() => {



        const removeListener =

            onSyncReady(() => {



                setSyncCompleted(

                    true

                );

            });



        return removeListener;



    }, []);



    // ========================================

    // Handle Focus

    // ========================================



    const handleFocus = () => {



        const userId =

            getUserId();



        if (!userId) {



            console.error(

                "Cannot edit block: user ID is not available"

            );



            return;

        }



        // ----------------------------------------

        // Set Active Block

        // ----------------------------------------



        setActiveBlockId(

            block._id

        );



        setSelectedBlockId(

            block._id

        );



        // ----------------------------------------

        // Check Existing Lock

        // ----------------------------------------



        const existingOwner =

            blockLocks.get(

                block._id

            );



        // ----------------------------------------

        // Another User Owns Lock

        // ----------------------------------------



        if (

            existingOwner &&

            existingOwner !== userId

        ) {

            return;

        }



        // ----------------------------------------

        // Already Owns Lock

        // ----------------------------------------



        if (

            existingOwner === userId

        ) {

            return;

        }



        // ----------------------------------------

        // Request Lock

        // ----------------------------------------



        requestBlockLock(

            block._id

        );

    };



    // ========================================

    // Handle Change

    // ========================================



    const handleChange = (

        event: React.ChangeEvent<

            HTMLTextAreaElement

        >

    ) => {



        const newContent =

            event.target.value;



        const userId =

            getUserId();



        // ----------------------------------------

        // Check Authentication

        // ----------------------------------------



        if (!userId) {



            console.error(

                "Cannot edit block: user ID is not available"

            );



            return;

        }



        // ----------------------------------------

        // Verify Lock Ownership

        // ----------------------------------------



        const existingOwner =

            blockLocks.get(

                block._id

            );



        if (

            existingOwner !== userId

        ) {



            console.warn(

                "Cannot edit block. Current user does not own the lock."

            );



            return;

        }



        // ----------------------------------------

        // Get Y.Text

        // ----------------------------------------



        const sharedText =

            blocks.get(

                block._id

            );



        if (!sharedText) {

            return;

        }



        // ========================================

        // Calculate Text Difference

        // ========================================



        let start = 0;



        while (

            start < content.length &&

            start < newContent.length &&

            content[start] ===

            newContent[start]

        ) {

            start++;

        }



        let oldEnd =

            content.length;



        let newEnd =

            newContent.length;



        while (

            oldEnd > start &&

            newEnd > start &&

            content[oldEnd - 1] ===

            newContent[newEnd - 1]

        ) {

            oldEnd--;

            newEnd--;

        }



        const deleteLength =

            oldEnd - start;



        const insertedText =

            newContent.slice(

                start,

                newEnd

            );



        // ========================================

        // Update Y.Text

        // ========================================



        if (

            deleteLength > 0

        ) {



            sharedText.delete(

                start,

                deleteLength

            );

        }



        if (

            insertedText.length > 0

        ) {



            sharedText.insert(

                start,

                insertedText

            );

        }



        // ========================================

        // Update Local React Content

        // ========================================



        setContent(

            newContent

        );



        // ========================================

        // Update AST

        // ========================================



        onBlockContentChange(

            block._id,

            newContent

        );



        // ========================================

        // Update Cursor

        // ========================================



        setCursorPosition(

            event.target.selectionStart

        );



        // ========================================

        // Update Selection

        // ========================================



        setSelectionStart(

            event.target.selectionStart

        );



        setSelectionEnd(

            event.target.selectionEnd

        );

    };



    // ========================================

    // Handle Selection

    // ========================================



    const handleSelect = (

        event: React.SyntheticEvent<

            HTMLTextAreaElement

        >

    ) => {



        const textarea =

            event.currentTarget;



        setCursorPosition(

            textarea.selectionStart

        );



        setSelectionStart(

            textarea.selectionStart

        );



        setSelectionEnd(

            textarea.selectionEnd

        );

    };



    // ========================================

    // Handle Click

    // ========================================



    const handleClick = (

        event: React.MouseEvent<

            HTMLTextAreaElement

        >

    ) => {



        const textarea =

            event.currentTarget;



        setActiveBlockId(

            block._id

        );



        setSelectedBlockId(

            block._id

        );



        setCursorPosition(

            textarea.selectionStart

        );



        setSelectionStart(

            textarea.selectionStart

        );



        setSelectionEnd(

            textarea.selectionEnd

        );

    };



    // ========================================

    // Handle Delete

    // ========================================



    const handleDelete = () => {



        const userId =

            getUserId();



        if (!userId) {



            console.error(

                "Cannot delete block: user ID is not available"

            );



            return;

        }



        // ----------------------------------------

        // Check Current Lock

        // ----------------------------------------



        const existingOwner =

            blockLocks.get(

                block._id

            );



        // ----------------------------------------

        // Another User Owns Lock

        // ----------------------------------------



        if (

            existingOwner &&

            existingOwner !== userId

        ) {



            console.log(

                "Block is locked by another user. Requesting delete permission."

            );



            requestDeleteBlock(

                block._id

            );



            return;

        }



        // ----------------------------------------

        // Block Is Unlocked

        // OR

        // Current User Owns Lock

        // ----------------------------------------



        requestDeleteBlock(

            block._id

        );

    };



    // ========================================

    // Approve Delete

    // ========================================



    const handleApproveDelete = () => {



        if (!deleteRequest) {

            return;

        }



        approveDeleteRequest(

            deleteRequest.requestId

        );



        setDeleteRequest(

            null

        );

    };



    // ========================================

    // Reject Delete

    // ========================================



    const handleRejectDelete = () => {



        if (!deleteRequest) {

            return;

        }



        rejectDeleteRequest(

            deleteRequest.requestId

        );



        setDeleteRequest(

            null

        );

    };



    // ========================================

    // Handle Unlock

    // ========================================



    const handleUnlock = () => {



        const userId =

            getUserId();



        if (!userId) {

            return;

        }



        // ----------------------------------------

        // Verify Ownership

        // ----------------------------------------



        if (

            lockOwner !== userId

        ) {



            console.warn(

                "Cannot unlock block. Current user does not own the lock."

            );



            return;

        }



        // ----------------------------------------

        // Request Unlock

        // ----------------------------------------



        releaseBlockLock(

            block._id

        );

    };



    // ========================================

    // Visual Block State

    // ========================================



    const blockBackground =

        isLockedByAnotherUser

            ? "#fef2f2"

            : isOwnedByCurrentUser

                ? "#f0fdf4"

                : isActive

                    ? "#eef2ff"

                    : "#ffffff";



    const blockBorder =

        isLockedByAnotherUser

            ? "1px solid #fca5a5"

            : isOwnedByCurrentUser

                ? "2px solid #22c55e"

                : isActive

                    ? "2px solid #4f46e5"

                    : "1px solid #e2e8f0";



    const textareaBackground =

        isLockedByAnotherUser

            ? "#fff7f7"

            : isOwnedByCurrentUser

                ? "#f7fff9"

                : "#ffffff";



    // ========================================

    // Render

    // ========================================



    return (

        <div

            style={{

                marginBottom: "16px",

                background: blockBackground,

                border: blockBorder,

                borderRadius: "10px",

                padding: "14px",

                transition:

                    "border 0.2s ease, background 0.2s ease",

                boxShadow: isActive

                    ? "0 2px 8px rgba(79, 70, 229, 0.08)"

                    : "none"

            }}

        >



            {/* Delete Permission Request */}



            {deleteRequest && (

                <div

                    style={{

                        marginBottom: "12px",

                        padding: "12px",

                        borderRadius: "8px",

                        background: "#fff7ed",

                        border:

                            "1px solid #fdba74"

                    }}

                >



                    <div

                        style={{

                            fontSize: "13px",

                            fontWeight: 600,

                            color: "#9a3412",

                            marginBottom: "6px"

                        }}

                    >

                        Delete Permission Request

                    </div>



                    <div

                        style={{

                            fontSize: "12px",

                            color: "#7c2d12",

                            marginBottom: "10px"

                        }}

                    >

                        User{" "}

                        {

                            deleteRequest

                                .requesterId

                                .slice(

                                    0,

                                    6

                                )

                        }{" "}

                        wants to delete this block.

                    </div>



                    <div

                        style={{

                            display: "flex",

                            justifyContent:

                                "flex-end",

                            gap: "8px"

                        }}

                    >



                        <button

                            type="button"

                            onClick={

                                handleRejectDelete

                            }

                            style={{

                                padding:

                                    "6px 10px",

                                border:

                                    "1px solid #fca5a5",

                                borderRadius:

                                    "6px",

                                background:

                                    "#ffffff",

                                color:

                                    "#b91c1c",

                                fontSize:

                                    "12px",

                                fontWeight:

                                    600,

                                cursor:

                                    "pointer"

                            }}

                        >

                            Reject

                        </button>



                        <button

                            type="button"

                            onClick={

                                handleApproveDelete

                            }

                            style={{

                                padding:

                                    "6px 10px",

                                border:

                                    "1px solid #86efac",

                                borderRadius:

                                    "6px",

                                background:

                                    "#ffffff",

                                color:

                                    "#15803d",

                                fontSize:

                                    "12px",

                                fontWeight:

                                    600,

                                cursor:

                                    "pointer"

                            }}

                        >

                            Allow

                        </button>



                    </div>



                </div>

            )}



            {/* Block Header */}



            <div

                style={{

                    display: "flex",

                    justifyContent:

                        "space-between",

                    alignItems: "center",

                    gap: "12px",

                    marginBottom: "10px"

                }}

            >



                {/* Block Type */}



                <span

                    style={{

                        display: "inline-flex",

                        alignItems: "center",

                        padding: "4px 8px",

                        borderRadius:

                            "999px",

                        background: "#f1f5f9",

                        color: "#475569",

                        fontSize: "11px",

                        fontWeight: 600,

                        textTransform:

                            "uppercase"

                    }}

                >

                    {block.type}

                </span>



                {/* Block Status */}



                <div

                    style={{

                        display: "flex",

                        alignItems: "center",

                        gap: "8px"

                    }}

                >



                    {isLockedByAnotherUser && (

                        <span

                            style={{

                                display:

                                    "inline-flex",

                                alignItems:

                                    "center",

                                padding:

                                    "5px 9px",

                                borderRadius:

                                    "999px",

                                background:

                                    "#fee2e2",

                                color:

                                    "#b91c1c",

                                fontSize:

                                    "11px",

                                fontWeight: 600

                            }}

                        >

                            🔒 Locked

                        </span>

                    )}



                    {isOwnedByCurrentUser && (

                        <span

                            style={{

                                display:

                                    "inline-flex",

                                alignItems:

                                    "center",

                                padding:

                                    "5px 9px",

                                borderRadius:

                                    "999px",

                                background:

                                    "#dcfce7",

                                color:

                                    "#15803d",

                                fontSize:

                                    "11px",

                                fontWeight: 600

                            }}

                        >

                            ✏️ Editing

                        </span>

                    )}



                    {!isLockedByAnotherUser &&

                        !isOwnedByCurrentUser &&

                        isActive && (

                            <span

                                style={{

                                    display:

                                        "inline-flex",

                                    alignItems:

                                        "center",

                                    padding:

                                        "5px 9px",

                                    borderRadius:

                                        "999px",

                                    background:

                                        "#e0e7ff",

                                    color:

                                        "#4338ca",

                                    fontSize:

                                        "11px",

                                    fontWeight: 600

                                }}

                            >

                                ● Active

                            </span>

                        )}



                    {syncCompleted && (

                        <span

                            style={{

                                display:

                                    "inline-flex",

                                alignItems:

                                    "center",

                                padding:

                                    "5px 9px",

                                borderRadius:

                                    "999px",

                                background:

                                    "#f0fdf4",

                                color:

                                    "#16a34a",

                                fontSize:

                                    "11px",

                                fontWeight: 600

                            }}

                        >

                            ✓ Synced

                        </span>

                    )}



                    {!syncCompleted && (

                        <span

                            style={{

                                display:

                                    "inline-flex",

                                alignItems:

                                    "center",

                                padding:

                                    "5px 9px",

                                borderRadius:

                                    "999px",

                                background:

                                    "#fefce8",

                                color:

                                    "#a16207",

                                fontSize:

                                    "11px",

                                fontWeight: 600

                            }}

                        >

                            ⟳ Syncing...

                        </span>

                    )}



                </div>



            </div>



            {/* Lock Information */}



            {isLockedByAnotherUser && (

                <div

                    style={{

                        marginBottom: "8px",

                        padding: "8px 10px",

                        borderRadius: "6px",

                        background: "#fee2e2",

                        color: "#991b1b",

                        fontSize: "12px"

                    }}

                >

                    🔒 This block is being

                    edited by another user.

                    You can still see live

                    updates, but editing is

                    temporarily disabled.

                </div>

            )}



            {/* Block Editor */}



            <textarea

                value={content}

                onChange={handleChange}

                onFocus={handleFocus}

                onClick={handleClick}

                onSelect={handleSelect}

                readOnly={

                    !syncCompleted ||

                    !blocks.get(block._id) ||

                    isLockedByAnotherUser

                }

                placeholder="Start writing..."

                style={{

                    width: "100%",

                    minHeight: "100px",

                    padding: "10px",

                    resize: "vertical",

                    borderRadius: "7px",

                    border:

                        isLockedByAnotherUser

                            ? "1px solid #fca5a5"

                            : isOwnedByCurrentUser

                                ? "1px solid #86efac"

                                : "1px solid #cbd5e1",

                    background:

                        textareaBackground,

                    color: "#0f172a",

                    outline: "none",

                    cursor:

                        isLockedByAnotherUser

                            ? "not-allowed"

                            : "text",

                    fontFamily:

                        block.type === "code"

                            ? "monospace"

                            : "inherit",

                    lineHeight: "1.6"

                }}

            />



            {/* Remote Cursor Indicators */}



            {blockRemoteCursors.length >

                0 && (

                    <div

                        style={{

                            marginTop: "8px",

                            display: "flex",

                            flexWrap: "wrap",

                            gap: "6px"

                        }}

                    >



                        {blockRemoteCursors.map(

                            (

                                remoteCursor

                            ) => (

                                <div

                                    key={

                                        remoteCursor.userId

                                    }

                                    style={{

                                        display:

                                            "inline-flex",

                                        alignItems:

                                            "center",

                                        gap: "5px",

                                        padding:

                                            "5px 9px",

                                        borderRadius:

                                            "999px",

                                        background:

                                            "#ede9fe",

                                        color:

                                            "#5b21b6",

                                        fontSize:

                                            "11px",

                                        fontWeight: 600

                                    }}

                                >



                                    <span>

                                        ●

                                    </span>



                                    <span>

                                        {getCollaboratorName(

                                            remoteCursor.userId

                                        )}

                                    </span>



                                    <span

                                        style={{

                                            fontWeight:

                                                400

                                        }}

                                    >

                                        Cursor{" "}

                                        {

                                            remoteCursor

                                                .cursorPosition

                                        }

                                    </span>



                                    {

                                        remoteCursor

                                            .selectionStart !==

                                        remoteCursor

                                            .selectionEnd && (

                                            <span

                                                style={{

                                                    fontWeight:

                                                        400

                                                }}

                                            >

                                                Selection{" "}

                                                {

                                                    remoteCursor

                                                        .selectionStart

                                                }

                                                {" - "}

                                                {

                                                    remoteCursor

                                                        .selectionEnd

                                                }

                                            </span>

                                        )

                                    }



                                </div>

                            )

                        )}



                    </div>

                )}



            {/* Block Actions */}



            <div

                style={{

                    marginTop: "10px",

                    display: "flex",

                    justifyContent:

                        "flex-end",

                    gap: "8px"

                }}

            >



                {/* Delete Button */}



                <button

                    type="button"

                    onClick={handleDelete}

                    style={{

                        padding:

                            "7px 12px",

                        border:

                            "1px solid #fca5a5",

                        borderRadius:

                            "6px",

                        background:

                            "#ffffff",

                        color:

                            "#b91c1c",

                        fontSize:

                            "12px",

                        fontWeight: 600,

                        cursor:

                            "pointer"

                    }}

                >

                    🗑️ Delete Block

                </button>



                {/* Unlock Button */}



                {isOwnedByCurrentUser && (

                    <button

                        type="button"

                        onClick={

                            handleUnlock

                        }

                        style={{

                            padding:

                                "7px 12px",

                            border:

                                "1px solid #86efac",

                            borderRadius:

                                "6px",

                            background:

                                "#ffffff",

                            color:

                                "#15803d",

                            fontSize:

                                "12px",

                            fontWeight: 600,

                            cursor:

                                "pointer"

                        }}

                    >

                        🔓 Unlock Block

                    </button>

                )}



            </div>



            {/* Local Cursor / Selection */}



            {isActive && (

                <div

                    style={{

                        marginTop: "8px",

                        padding:

                            "6px 8px",

                        borderRadius:

                            "5px",

                        background:

                            "#f8fafc",

                        color:

                            "#64748b",

                        fontSize:

                            "10px"

                    }}

                >

                    Local cursor:{" "}

                    {cursorPosition}

                    {" | "}

                    Selection:{" "}

                    {selectionStart}

                    {" - "}

                    {selectionEnd}

                </div>

            )}



            {/* Child Blocks */}



            {block.children &&

                block.children.length >

                0 && (

                    <div

                        style={{

                            marginLeft:

                                "20px",

                            marginTop:

                                "12px",

                            paddingLeft:

                                "12px",

                            borderLeft:

                                "2px solid #e2e8f0"

                        }}

                    >



                        {block.children.map(

                            (

                                child

                            ) => (

                                <BlockRenderer

                                    key={

                                        child._id

                                    }

                                    block={

                                        child

                                    }

                                    onBlockContentChange={

                                        onBlockContentChange

                                    }

                                />

                            )

                        )}



                    </div>

                )}



        </div>

    );

};



export default BlockRenderer;