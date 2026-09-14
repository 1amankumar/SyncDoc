export interface Block {
    _id: string;
    type: string;
    content: string;
    children: Block[];
}

export interface Document {
    _id: string;
    title: string;
    blocks: Block[];
    createdAt: string;
    updatedAt: string;
}