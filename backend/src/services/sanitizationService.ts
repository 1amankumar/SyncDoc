import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

import {
    IBlock
} from "../models/Document.js";

const window =
    new JSDOM("").window;

const DOMPurify =
    createDOMPurify(window);

export const sanitizeBlockContent = (
    content: string
): string => {
    return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
    });
};

export const sanitizeBlockTree = (
    blocks: IBlock[]
): IBlock[] => {
    return blocks.map((block) => ({
        ...block,

        content:
            sanitizeBlockContent(
                block.content
            ),

        children:
            block.children &&
                block.children.length > 0
                ? sanitizeBlockTree(
                    block.children
                )
                : []
    }));
};