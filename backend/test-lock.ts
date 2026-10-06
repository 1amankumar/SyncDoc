import WebSocket from "ws";
import * as Y from "yjs";

const documentId =
    "6ac50672e92d00af1e75d9f2";

const amanUserId =
    "6abeb8dcfa5a4f46fae4626b";

const blockId =
    "40e9010d-8533-45ce-a265-63b081ddef03";

const socket =
    new WebSocket(
        `ws://localhost:5001/document/${documentId}?userId=${amanUserId}`
    );

socket.on(
    "open",
    () => {

        console.log(
            "TEST CLIENT CONNECTED AS AMAN"
        );

        console.log(
            "Waiting for document state..."
        );
    }
);

socket.on(
    "message",
    (
        data,
        isBinary
    ) => {

        // -------------------------------
        // Server control message
        // -------------------------------

        if (!isBinary) {

            const message =
                JSON.parse(
                    data.toString()
                );

            console.log(
                "SERVER MESSAGE:",
                message
            );

            // -------------------------------
            // Rejection received
            // -------------------------------

            if (
                message.type ===
                "updateRejected"
            ) {

                console.log(
                    "================================"
                );

                console.log(
                    "SUCCESS: SERVER REJECTED UPDATE"
                );

                console.log(
                    "Block:",
                    message.blockId
                );

                console.log(
                    "Locked by:",
                    message.lockedBy
                );

                console.log(
                    "Reason:",
                    message.reason
                );

                console.log(
                    "Authoritative content:",
                    message.content
                );

                console.log(
                    "================================"
                );

                socket.close();

                return;
            }

            return;
        }

        // -------------------------------
        // Yjs document state
        // -------------------------------

        const update =
            new Uint8Array(
                data as Buffer
            );

        const testDoc =
            new Y.Doc();

        Y.applyUpdate(
            testDoc,
            update
        );

        const blocks =
            testDoc.getMap<Y.Text>(
                "blocks"
            );

        const currentBlock =
            blocks.get(
                blockId
            );

        if (
            !(currentBlock instanceof Y.Text)
        ) {

            console.error(
                "Block not found in server state"
            );

            return;
        }

        console.log(
            "Received Yjs document state"
        );

        console.log(
            "Current block content:",
            currentBlock.toString()
        );

        // -------------------------------
        // Create unauthorized update
        // -------------------------------

        const stateBefore =
            Y.encodeStateVector(
                testDoc
            );

        testDoc.transact(
            () => {

                currentBlock.insert(
                    currentBlock.length,
                    " UNAUTHORIZED TEST"
                );

            }
        );

        const unauthorizedUpdate =
            Y.encodeStateAsUpdate(
                testDoc,
                stateBefore
            );

        console.log(
            "Attempting to edit locked block as Aman..."
        );

        console.log(
            "Sending unauthorized Yjs update..."
        );

        socket.send(
            unauthorizedUpdate
        );
    }
);

socket.on(
    "error",
    (error) => {

        console.error(
            "TEST SOCKET ERROR:",
            error
        );
    }
);

socket.on(
    "close",
    () => {

        console.log(
            "TEST CLIENT DISCONNECTED"
        );

    }
);