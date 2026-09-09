import mongoose, { Document as MongoDocument, Schema } from "mongoose";

export interface IBlock {
    type: string;
    content: string;
    children: IBlock[];
}

export interface IDocument extends MongoDocument {
    title: string;
    blocks: IBlock[];
}

const blockSchema = new Schema<IBlock>(
    {
        type: {
            type: String,
            required: true,
            trim: true
        },

        content: {
            type: String,
            required: true
        }
    },
    {
        _id: true
    }
);

blockSchema.add({
    children: {
        type: [blockSchema],
        default: []
    }
});

const documentSchema = new Schema<IDocument>(
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

documentSchema.pre("save", function (next) {
    const validateBlocks = (blocks: IBlock[]): void => {
        for (const block of blocks) {
            if (!block.type.trim()) {
                throw new Error("Block type is required");
            }

            if (typeof block.content !== "string") {
                throw new Error("Block content must be a string");
            }

            if (block.children.length > 0) {
                validateBlocks(block.children);
            }
        }
    };

    validateBlocks(this.blocks);

    //next();
});

const DocumentModel = mongoose.model<IDocument>(
    "Document",
    documentSchema
);

export default DocumentModel;