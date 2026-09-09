# SyncDoc
Collaborative Document Engine with AST Conflict Resolution

SyncDoc is a MERN-based real-time collaborative editor where multiple users can join the same document, edit it simultaneously, receive each other's changes instantly through Socket.IO, and persist their work using MongoDB.

# SyncDoc

## 1. Problem Statement

SyncDoc aims to solve the problem of real-time collaboration in document and code editing.

In traditional development and document-sharing workflows, multiple users cannot easily work on the same document at the same time. Users often have to share files, refresh pages, or manually merge changes, which can lead to outdated versions, conflicts, and inefficient collaboration.

SyncDoc provides a centralized collaborative environment where multiple users can work on the same document simultaneously. Changes made by one user are synchronized with other connected users in real time, allowing everyone to work with the latest version of the document.

### Key Problems We Address

* Lack of real-time collaboration.
* Multiple versions of the same document.
* Manual file sharing and synchronization.
* Conflicts caused by simultaneous editing.
* Difficulty tracking active collaborators.
* Need for persistent document storage.

---

## 2. Solution Approach

SyncDoc solves these problems by combining a modern web stack with real-time communication.

The application will use the **MERN stack** along with **Socket.IO** for real-time synchronization.

### How It Works

```text
                    ┌───────────────────┐
                    │      SyncDoc      │
                    │      Server       │
                    └─────────┬─────────┘
                              │
                       Real-Time Sync
                              │
                ┌─────────────┴─────────────┐
                │                           │
           ┌────▼────┐                 ┌────▼────┐
           │  User A │                 │  User B │
           │  Editor │                 │  Editor │
           └─────────┘                 └─────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                         MongoDB
                    Persistent Storage
```

### Technology Approach

* **React** — Builds the frontend and collaborative editor interface.
* **Node.js & Express.js** — Handles backend logic and REST APIs.
* **MongoDB** — Stores users, documents, and persistent document data.
* **Socket.IO** — Provides real-time communication between connected users.
* **Monaco Editor** — Provides the code/document editing experience.
* **JWT** — Handles user authentication and protected access.

### Collaboration Flow

1. A user logs into SyncDoc.
2. The user creates or opens a document.
3. Other users can join the same document.
4. Each connected user joins a Socket.IO room associated with that document.
5. When a user makes an edit, the change is sent to the SyncDoc server through Socket.IO.
6. The server broadcasts the change to other users in the same room.
7. Other users see the change without refreshing the page.
8. The document is persisted in MongoDB so that the work is not lost.

### Real-Time Synchronization

```text
User A
  │
  │ Edit Document
  ▼
React Editor
  │
  │ Socket.IO
  ▼
SyncDoc Server
  │
  │ Broadcast Change
  ▼
┌─────────────────┐
│ Document Room   │
└────────┬────────┘
         │
         ▼
      User B
         │
         ▼
   Updated Editor
```

This approach separates **real-time synchronization** from **permanent storage**:

* **Socket.IO** → keeps connected users synchronized in real time.
* **MongoDB** → stores the document persistently.
* **REST APIs** → handle authentication and document-related operations.



# SyncDoc — Database & Entity Design

SyncDoc is a collaborative document editing platform built around a **nested document structure (AST)** and real-time collaboration using **Yjs/CRDTs and WebSockets**.

This document describes the planned database entities, their relationships, and the scope of the initial implementation.

---

## 📌 Entity Overview

The planned system consists of the following entities:

| Entity               | Purpose                          
| -------------------- | -------------------------------- 
| **User**             | Application users                
| **Document** ⭐       | Main document entity           
| **Block** ⭐          | Nested AST structure             
| **DocumentUser**     | User-document membership & roles 
| **Revision**         | Document version history         
| **Collaboration**    | Live presence & cursor state     
| **YDoc / Yjs State** | Persisted CRDT state             

---

# 1. User

The `User` entity represents a user of SyncDoc.

### Attributes

| Attribute   | Type     | Purpose                 |
| ----------- | -------- | ----------------------- |
| `_id`       | ObjectId | Unique user ID          |
| `name`      | String   | User's name             |
| `email`     | String   | User's email            |
| `password`  | String   | Authentication password |
| `avatar`    | String   | Optional profile image  |
| `createdAt` | Date     | Account creation time   |
| `updatedAt` | Date     | Last update time        |

### Relationship

One user can create multiple documents.

```text
User
  │
  │ creates
  │
  ▼
Document
  1          N
```

**Relationship:** `User 1 ─── N Document`

---

# 2. Document ⭐

The `Document` entity is the **main entity of SyncDoc**.

A document stores its structural content as an array of nested `Block` objects.

### Attributes

| Attribute   | Type           | Purpose                       |
| ----------- | -------------- | ----------------------------- |
| `_id`       | ObjectId       | Unique document ID            |
| `title`     | String         | Document title                |
| `blocks`    | Array of Block | Stores the AST structure      |
| `createdBy` | ObjectId       | User who created the document |
| `createdAt` | Date           | Document creation time        |
| `updatedAt` | Date           | Last modification time        |

### Relationship

```text
User
  │
  │ creates
  ▼
Document
  │
  │ contains
  ▼
Block[]
```

A document can contain multiple blocks.

The `Document` → `Block[]` relationship is one of the most important relationships in **Week 1**, because the project requires support for nested document structural nodes.

---

# 3. Block ⭐

A `Block` represents one structural part of a document.

Examples include:

* Heading
* Paragraph
* Code
* List
* Section

The `type` field is intentionally kept as a `String` because the project specification does not prescribe a fixed set of block types.

### Attributes

| Attribute  | Type           | Purpose              |
| ---------- | -------------- | -------------------- |
| `_id`      | ObjectId       | Unique block ID      |
| `type`     | String         | Type of block        |
| `content`  | String         | Actual block content |
| `children` | Array of Block | Nested blocks        |

### Recursive Relationship

A block can contain other blocks.

```text
Document
   │
   │ contains
   ▼
 Block
   │
   │ contains
   ▼
 Block
   │
   │ contains
   ▼
 Block
```

This is a **recursive relationship**.

The recursive structure is represented by:

```typescript
children: IBlock[];
```

This allows SyncDoc to represent a nested **Abstract Syntax Tree (AST)**.

### Example

```text
Document
│
├── Heading
│
├── Paragraph
│
├── Section
│   ├── Heading
│   ├── Paragraph
│   └── Code
│
└── List
    ├── List Item
    └── List Item
```

This nested structure is the core of the Week 1 database design.

---

# 4. DocumentUser

`DocumentUser` connects users with documents.

This entity becomes useful when multiple users need to collaborate on the same document.

### Attributes

| Attribute    | Type     | Purpose                        |
| ------------ | -------- | ------------------------------ |
| `_id`        | ObjectId | Relationship record ID         |
| `userId`     | ObjectId | Reference to User              |
| `documentId` | ObjectId | Reference to Document          |
| `role`       | String   | `owner`, `editor`, or `viewer` |
| `joinedAt`   | Date     | When the user joined           |
| `lastActive` | Date     | User's last activity           |

### Relationship

```text
User
  N
  │
  │
  ▼
DocumentUser
  ▲
  │
  │
  N
Document
```

Conceptually:

```text
User ─── DocumentUser ─── Document
```

This acts as a bridge between users and documents.

It can later be used for:

* Access control
* Permissions
* Document sharing
* Collaboration membership

> **Note:** `DocumentUser` is not explicitly required for Week 1 and can be implemented later.

---

# 5. Revision

A `Revision` represents a previous version or snapshot of a document.

### Attributes

| Attribute    | Type     | Purpose                       |
| ------------ | -------- | ----------------------------- |
| `_id`        | ObjectId | Unique revision ID            |
| `documentId` | ObjectId | Reference to Document         |
| `content`    | Block[]  | Snapshot of document blocks   |
| `createdBy`  | ObjectId | User who created the revision |
| `message`    | String   | Optional change description   |
| `createdAt`  | Date     | Revision creation time        |

### Relationship

```text
Document
   │
   │ has
   ▼
Revision
```

**Relationship:** `Document 1 ─── N Revision`

One document can have multiple revisions.

Possible future uses:

* Version history
* Undo/restore
* Change tracking
* Document recovery

> **Note:** `Revision` is an optional design choice and is not required for the initial Week 1 implementation.

---

# 6. Collaboration

`Collaboration` represents a user's live collaboration and presence state.

SyncDoc will eventually support real-time collaboration and presence indicators.

### Attributes

| Attribute    | Type     | Purpose                    |
| ------------ | -------- | -------------------------- |
| `_id`        | ObjectId | Collaboration record ID    |
| `documentId` | ObjectId | Document being edited      |
| `userId`     | ObjectId | User participating         |
| `cursor`     | Object   | Current cursor position    |
| `isOnline`   | Boolean  | Whether the user is online |
| `lastSeen`   | Date     | Last activity time         |

### Relationship

```text
User
  1
  │
  │ participates
  ▼
Collaboration
  ▲
  │
  │ belongs to
  │
Document
```

This allows the system to determine:

> Which users are currently collaborating on which document?

This entity will become more relevant during the real-time collaboration implementation.

---

# 7. YDoc / Yjs State

SyncDoc uses **Yjs/CRDTs and WebSockets** for real-time document synchronization.

However, the project specification does **not explicitly require Yjs state to be stored as a MongoDB entity**.

Therefore, `YDoc` should not be considered a required database model at this stage.

If persistent Yjs state is required later, a possible structure would be:

### Attributes

| Attribute    | Type     | Purpose              |
| ------------ | -------- | -------------------- |
| `_id`        | ObjectId | State ID             |
| `documentId` | ObjectId | Related document     |
| `data`       | Buffer   | Serialized Yjs state |
| `updatedAt`  | Date     | Last update time     |

### Relationship

```text
Document
   │
   │ has
   ▼
 YDoc
```

**Relationship:** `Document 1 ─── 1 YDoc`

> **Note:** This entity is optional and should only be introduced if persistent Yjs state is required.

---

# 🏗️ Complete Planned Entity Relationship

The complete planned system can be visualized as:

```text
                    ┌──────────────┐
                    │     User     │
                    └──────┬───────┘
                           │
                           │ creates
                           ▼
                    ┌──────────────┐
                    │   Document   │
                    └──────┬───────┘
                           │
                           │ contains
                           ▼
                    ┌──────────────┐
                    │    Block     │
                    └──────┬───────┘
                           │
                           │ children
                           ▼
                    ┌──────────────┐
                    │    Block     │
                    └──────────────┘


User ─────────── DocumentUser ─────────── Document


Document ────────────────────────────────► Revision


User ─────────── Collaboration ─────────── Document


Document ────────────────────────────────► YDoc
```

---

