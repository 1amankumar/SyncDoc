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

