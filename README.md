# QT-AI

> **Private by Default · Local-First · Peer-to-Peer Collaboration**

QT-AI is a **privacy-first, browser-based collaboration platform** designed for teams that need secure, real-time communication **without relying on centralized servers**. All collaboration happens **directly between peers**, and your data always stays under your control.

Built for **confidential business discussions, research teams, and private collaboration**, QT-AI focuses on speed, simplicity, and privacy by design.

---

## ✨ Core Principles

* **Private by Default** – No central server stores chats, files, or history
* **Local-First Architecture** – Your data lives in your browser
* **User-Controlled Collaboration** – Nothing is shared unless you choose
* **Peer-to-Peer Networking** – Direct connections using WebRTC
* **Zero-Backend Design** – No database, no cloud storage, no tracking

---

## 🚀 What QT-AI Does

QT-AI is an all-in-one **peer-to-peer collaboration workspace** for secure communication and teamwork.

### 🔐 Secure Collaboration

* Real-time **P2P chat**
* **Direct file sharing** between peers
* **Live whiteboards** for idea mapping and planning
* Simple peer discovery using **Peer IDs**

---

## 🧩 How It Works

### 1️⃣ Connect

* Exchange **Peer IDs** with collaborators
* Establish a direct **WebRTC tunnel**

### 2️⃣ Collaborate

* Chat, share files, and whiteboard in real time
* All data flows **directly between peers**

### 3️⃣ Disconnect

* Close the session and leave **no server-side trace**

---

## 🏗 Architecture Overview

```
Browser (User A)
   ├── Local Storage
   ├── React UI
   └── WebRTC  ⇄  WebRTC
                        └── Browser (User B)
```

### 🔧 Tech Stack

**Frontend**

* React 19
* TypeScript
* Tailwind CSS

**Networking**

* WebRTC
* PeerJS

**Storage**

* Browser-only (LocalStorage / IndexedDB)

---

## 🔒 Security & Privacy Model

* No central message server
* No conversation history stored remotely
* Files transferred **peer-to-peer**
* Sessions exist only while participants are connected
* Designed for sensitive and confidential workflows

> QT-AI is ideal for **private business talks, internal reviews, research discussions, and strategy sessions**.

---

## ⚖️ How QT-AI Compares

| Feature          | QT-AI  | Typical Cloud Collaboration Tools |
| ---------------- | ------ | --------------------------------- |
| Central Server   | ❌ None | ✅ Required                        |
| Data Retention   | ❌ No   | ✅ Yes                             |
| Local-First      | ✅ Yes  | ❌ No                              |
| Peer-to-Peer     | ✅ Yes  | ❌ No                              |
| Account Required | ❌ No   | ✅ Usually                         |

---

## ⚙️ Setup & Development

### Prerequisites

* Node.js 18+
* Modern browser (Chrome, Edge, Firefox)

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## 🧪 Challenges We Solved

* Real-time state synchronization **without servers**
* Secure peer discovery and connection handling
* Reliable file transfer over WebRTC
* Clean, minimal UI for fast collaboration

---

## 🏆 Accomplishments

* Fully functional **zero-backend** collaboration platform
* Seamless peer-to-peer networking in the browser
* Strong privacy guarantees by design
* Simple onboarding with no accounts or sign-ups

---

## 🔮 What’s Next

* End-to-End Encryption (E2EE) on top of WebRTC
* CRDT-based real-time co-authoring
* Voice calls for secure meetings
* Offline-first enhancements
* Self-hosted signaling options

---

## 📜 License

MIT License

---

## 🙌 Credits

Built with ❤️ for teams who believe **privacy is not optional**.

QT-AI proves that powerful collaboration doesn’t require the cloud.
