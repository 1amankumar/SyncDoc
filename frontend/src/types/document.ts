/**
 BLOCK TYPES :
    These will be the only block types that our editor currently supports.
 */

export type BlockType = "heading" | "paragraph" | "code";

// BLOCK INTERFACES 
// A block represents a single unit of content in the document. It can be a heading, paragraph, or code block. Each block has a unique identifier, a type, content, and can have child blocks.
export interface Block {
    _id: string;    //unique identifier for the block
    type: string;   //type of block[can be heading, paragraph , code ]
    content: string;    //actual text inside the block 
    children: Block[];  //array of child blocks since we use AST representation of the document and each block can have child blocks

}

// DOCUMENT INTERFACE
// A document represents the entire content structure, consisting of multiple blocks. 
// It has a unique identifier, a title, an array of blocks, and timestamps for creation and last update. 
export interface Document {
    _id: string;    //unique identifier for the document from MongoDB
    title: string;  //title of the document
    blocks: Block[];    //array of blocks that make up the document
    createdAt: string;  //timestamp for when the document was created
    updatedAt: string;  //timestamp for when the document was last updated
}