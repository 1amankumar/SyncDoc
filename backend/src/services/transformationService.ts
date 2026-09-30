import type {
    IBlock
} from "../models/Document.js";

// ========================================
// PDF Block Types
// ========================================

export interface PdfBlock {
    type:
        | "heading"
        | "paragraph"
        | "code";

    content: string;

    children: PdfBlock[];
}

// ========================================
// Transform Single AST Block
// ========================================

const transformBlock = (
    block: IBlock
): PdfBlock => {

    // ========================================
    // Normalize Block Type
    // ========================================

    let type:
        | "heading"
        | "paragraph"
        | "code";

    if (
        block.type === "heading"
    ) {

        type = "heading";

    } else if (
        block.type === "code"
    ) {

        type = "code";

    } else {

        type = "paragraph";
    }

    // ========================================
    // Transform Children
    // ========================================

    const children =
        block.children.map(
            (child) =>
                transformBlock(child)
        );

    // ========================================
    // Return PDF Block
    // ========================================

    return {
        type,
        content: block.content,
        children
    };
};

// ========================================
// Transform Complete AST
// ========================================

export const transformDocumentToPdf =
    (
        title: string,
        blocks: IBlock[]
    ) => {

        return {
            title,

            blocks: blocks.map(
                (block) =>
                    transformBlock(block)
            )
        };
    };