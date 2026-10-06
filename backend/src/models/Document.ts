import mongoose, {
    Document as MongoDocument,
    Schema
} from "mongoose";

// ========================================
// Block Interface
// ========================================

export interface IBlock {
    _id: string;
    type: string;
    content: string;
    children: IBlock[];
}

// ========================================
// Document Interface
// ========================================

export interface IDocument
    extends MongoDocument {

    title: string;
    blocks: IBlock[];
}

// ========================================
// Block Schema
// ========================================

const blockSchema =
    new Schema<IBlock>(
        {
            _id: {
                type: String,
                required: true
            },

            type: {
                type: String,
                required: true,
                trim: true
            },

            content: {
                type: String,
                default: ""
            }
        },
        {
            _id: false
        }
    );

// ========================================
// Children
// ========================================

blockSchema.add({
    children: {
        type: [blockSchema],
        default: []
    }
});

// ========================================
// Document Schema
// ========================================

const documentSchema =
    new Schema<IDocument>(
        {
            title: {
                type: String,
                required: true,
                trim: true
            },

            blocks: {
                type: [blockSchema],
                default: []
            }
        },
        {
            timestamps: true
        }
    );

// ========================================
// Validation
// ========================================

documentSchema.pre(
    "save",
    function () {

        const validateBlocks = (
            blocks: IBlock[]
        ): void => {

            for (
                const block of blocks
            ) {

                // --------------------------------
                // Block ID
                // --------------------------------

                if (!block._id) {

                    throw new Error(
                        "Block ID is required"
                    );
                }

                // --------------------------------
                // Block Type
                // --------------------------------

                if (
                    !block.type ||
                    !block.type.trim()
                ) {

                    throw new Error(
                        "Block type is required"
                    );
                }

                // --------------------------------
                // Block Content
                // --------------------------------

                if (
                    typeof block.content !==
                    "string"
                ) {

                    throw new Error(
                        "Block content must be a string"
                    );
                }

                // --------------------------------
                // Child Blocks
                // --------------------------------

                if (
                    block.children &&
                    block.children.length > 0
                ) {

                    validateBlocks(
                        block.children
                    );
                }
            }
        };

        validateBlocks(
            this.blocks
        );
    }
);

// ========================================
// Model
// ========================================

const DocumentModel =
    mongoose.model<IDocument>(
        "Document",
        documentSchema
    );

export default DocumentModel;