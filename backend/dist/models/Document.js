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
// ========================================
// Block Schema
// ========================================
const blockSchema = new mongoose_1.Schema({
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
        type: [mongoose_1.Schema.Types.Mixed],
        default: []
    }
}, {
    _id: false
});
// ========================================
// Collaborator Schema
// ========================================
const collaboratorSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    permission: {
        type: String,
        enum: ["view", "edit"],
        required: true,
        default: "view"
    }
}, {
    _id: false
});
// ========================================
// Document Schema
// ========================================
const documentSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    collaborators: {
        type: [collaboratorSchema],
        default: []
    }
}, {
    timestamps: true
});
// ========================================
// Mongoose Model
// ========================================
const DocumentModel = mongoose_1.default.model("Document", documentSchema);
exports.default = DocumentModel;
//# sourceMappingURL=Document.js.map