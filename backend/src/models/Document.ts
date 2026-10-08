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
// Collaborator Interface
// ========================================

export interface ICollaborator {
    user: mongoose.Types.ObjectId;
    permission: "view" | "edit";
}

// ========================================
// Document Interface
// ========================================

export interface IDocument
    extends MongoDocument {

    title: string;

    blocks: IBlock[];

    owner: mongoose.Types.ObjectId;

    collaborators: ICollaborator[];
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
                required: true
            },

            content: {
                type: String,
                default: ""
            },

            children: {
                type: [],
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
    new Schema<ICollaborator>(
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            },

            permission: {
                type: String,
                enum: [
                    "view",
                    "edit"
                ],
                default: "view",
                required: true
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
// Export Model
// ========================================

const DocumentModel =
    mongoose.model<IDocument>(
        "Document",
        documentSchema
    );

export default DocumentModel;