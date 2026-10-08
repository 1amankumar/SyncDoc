// ========================================
// Block Interface
// ========================================

export interface Block {
    _id: string;
    type: string;
    content: string;
    children?: Block[];
}

// ========================================
// Collaborator Interface
// ========================================

export interface Collaborator {
    user: string;
    permission: "view" | "edit";

    // Optional fields returned by the share API
    id?: string;
    name?: string;
    email?: string;
}

// ========================================
// Document Interface
// ========================================

export interface Document {
    _id: string;
    title: string;
    blocks: Block[];

    // Owner user ID
    owner: string;

    // Users who have access to the document
    collaborators: Collaborator[];

    createdAt?: string;
    updatedAt?: string;
}