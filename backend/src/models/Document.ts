import mongoose, {
    Schema,
    Types
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
// Collaborator Interface
// ========================================

export interface ICollaborator {
    user: Types.ObjectId;
    permission: "view" | "edit";
}

// ========================================
// Document Interface
// ========================================

export interface IDocument {
    title: string;
    blocks: IBlock[];
    owner: Types.ObjectId;
    collaborators: ICollaborator[];
    createdAt?: Date;
    updatedAt?: Date;
}

// ========================================
// Block Schema
// ========================================

const blockSchema = new Schema(
    {
        _id: {
            type: String,
            required: true
        },

        type: {
            type: String,
            required: true
        },

        content: {
            type: String,
            default: ""
        },

        children: {
            type: [Schema.Types.Mixed],
            default: []
        }
    },
    {
        _id: false
    }
);

// ========================================
// Collaborator Schema
// ========================================

const collaboratorSchema =
    new Schema(
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            },

            permission: {
                type: String,
                enum: ["view", "edit"],
                required: true,
                default: "view"
            }
        },
        {
            _id: false
        }
    );

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
            },

            owner: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            },

            collaborators: {
                type: [collaboratorSchema],
                default: []
            }
        },
        {
            timestamps: true
        }
    );

// ========================================
// Mongoose Model
// ========================================

const DocumentModel =
    mongoose.model<IDocument>(
        "Document",
        documentSchema
    );

export default DocumentModel;