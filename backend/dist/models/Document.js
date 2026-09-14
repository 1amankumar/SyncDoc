"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const blockSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    }
}, {
    _id: true
});
blockSchema.add({
    children: {
        type: [blockSchema],
        default: []
    }
});
const documentSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    blocks: {
        type: [blockSchema],
        default: []
    }
}, {
    timestamps: true
});
documentSchema.pre("save", function (next) {
    const validateBlocks = (blocks) => {
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
const DocumentModel = mongoose_1.default.model("Document", documentSchema);
exports.default = DocumentModel;
//# sourceMappingURL=Document.js.map