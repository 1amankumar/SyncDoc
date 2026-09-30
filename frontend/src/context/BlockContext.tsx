import {
    createContext,
    useContext,
    useState,
    type ReactNode
} from "react";

import type {
    Block
} from "../types/document";

// ========================================
// Context Type
// ========================================

interface BlockContextType {

    activeBlockId: string | null;

    cursorPosition: number;

    selectionStart: number;

    selectionEnd: number;

    setActiveBlockId: (
        blockId: string | null
    ) => void;

    setCursorPosition: (
        position: number
    ) => void;

    setSelectionStart: (
        position: number
    ) => void;

    setSelectionEnd: (
        position: number
    ) => void;

    updateBlockContent: (
        blocks: Block[],
        blockId: string,
        content: string
    ) => Block[];
}

// ========================================
// Context
// ========================================

const BlockContext =
    createContext<
        BlockContextType | undefined
    >(undefined);

// ========================================
// Provider Props
// ========================================

interface BlockProviderProps {
    children: ReactNode;
}

// ========================================
// Provider
// ========================================

export const BlockProvider = ({
    children
}: BlockProviderProps) => {

    // ========================================
    // Active Block
    // ========================================

    const [
        activeBlockId,
        setActiveBlockId
    ] = useState<string | null>(
        null
    );

    // ========================================
    // Cursor Position
    // ========================================

    const [
        cursorPosition,
        setCursorPosition
    ] = useState<number>(0);

    // ========================================
    // Selection Start
    // ========================================

    const [
        selectionStart,
        setSelectionStart
    ] = useState<number>(0);

    // ========================================
    // Selection End
    // ========================================

    const [
        selectionEnd,
        setSelectionEnd
    ] = useState<number>(0);

    // ========================================
    // Update Specific AST Block
    // ========================================

    const updateBlockContent = (
        documentBlocks: Block[],
        blockId: string,
        content: string
    ): Block[] => {

        return documentBlocks.map(
            (block) => {

                // ----------------------------------------
                // Target Block
                // ----------------------------------------

                if (
                    block._id === blockId
                ) {

                    return {
                        ...block,
                        content
                    };
                }

                // ----------------------------------------
                // Nested Blocks
                // ----------------------------------------

                if (
                    block.children &&
                    block.children.length > 0
                ) {

                    return {
                        ...block,
                        children:
                            updateBlockContent(
                                block.children,
                                blockId,
                                content
                            )
                    };
                }

                // ----------------------------------------
                // Other Blocks
                // ----------------------------------------

                return block;
            }
        );
    };

    // ========================================
    // Provider
    // ========================================

    return (
        <BlockContext.Provider
            value={{
                activeBlockId,
                cursorPosition,
                selectionStart,
                selectionEnd,
                setActiveBlockId,
                setCursorPosition,
                setSelectionStart,
                setSelectionEnd,
                updateBlockContent
            }}
        >
            {children}
        </BlockContext.Provider>
    );
};

// ========================================
// Custom Hook
// ========================================

export const useBlockContext =
    (): BlockContextType => {

        const context =
            useContext(
                BlockContext
            );

        if (!context) {

            throw new Error(
                "useBlockContext must be used inside BlockProvider"
            );
        }

        return context;
    };