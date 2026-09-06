````markdown
# Personal Gemini Journal — AI Memory Vault

A privacy-first personal journaling and reflection application built with **Google Gemini, Firebase Authentication, Cloud Firestore, Google Cloud Secret Manager, and Google Cloud Run**.

Built for the **Google Cloud Run AI Challenge**, extending the Personal Gemini Journal baseline with persistent memory, recurring themes, controlled AI access, and a server-enforced Privacy Firewall.

## ✨ Key Features

- **🔐 Federated Google Authentication** — Google Sign-In through Firebase Authentication with server-side identity verification.
- **🛡️ Owner-Bound Database Isolation** — Firestore security rules ensure users can only access their own data.
- **🔒 AI Privacy Firewall** — Entries marked **Keep Private** are never included in Gemini context. This is enforced server-side.
- **🧠 Persistent Memory Reflection** — Gemini can reflect across eligible historical journal entries.
- **🔎 Recurring Themes** — Identifies recurring themes across eligible memories with supporting journal entries.
- **🎯 Controlled Reflection Scope** — Reflect across the entire eligible vault, specific thoughts, a label, or the current thought.
- **💬 Multi-Turn Reflection** — Gemini conversations are persisted in Firestore.
- **☁️ Secure Secret Management** — Gemini credentials remain server-side and can be supplied through Google Cloud Secret Manager.
- **🧪 Security Verification** — Authentication, privacy enforcement, user isolation, persistence, and Gemini access paths are tested.

> **Core principle:** Gemini can remember what you choose to share, but it can never access what you mark private.

---

## 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │        User          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    React Frontend    │
                         │                      │
                         │ Today / Memories     │
                         │ Reflect / Privacy    │
                         └──────────┬───────────┘
                                    │
                              Firebase ID Token
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Express Backend   │
                         │                      │
                         │ Token verification   │
                         │ Privacy Firewall     │
                         │ Context filtering    │
                         │ Gemini proxy         │
                         └───────┬───────┬──────┘
                                 │       │
                    ┌────────────┘       └─────────────┐
                    ▼                                  ▼
          ┌──────────────────┐               ┌──────────────────┐
          │  Cloud Firestore │               │   Google Gemini  │
          │                  │               │                  │
          │ User-isolated    │               │ Reflection &     │
          │ journal data     │               │ theme analysis   │
          └──────────────────┘               └──────────────────┘
````

---

## 🛠️ Technology Stack

| Layer                 | Technology                  |
| --------------------- | --------------------------- |
| Frontend              | React + TypeScript          |
| Backend               | Node.js + Express           |
| Authentication        | Firebase Authentication     |
| Database              | Cloud Firestore             |
| AI                    | Google Gemini API           |
| Server Authentication | Firebase Admin SDK          |
| Secret Management     | Google Cloud Secret Manager |
| Development           | Google AI Studio            |
| Deployment Target     | Google Cloud Run            |
| Repository            | GitHub                      |

---

# 🔐 Security Architecture

## Authentication

Users authenticate using Google Sign-In through Firebase Authentication.

The backend does not trust a user ID supplied by the client.

The authentication flow is:

1. The client sends a Firebase ID token.
2. The backend verifies the token using the Firebase Admin SDK.
3. The verified Firebase `uid` becomes the authoritative identity.
4. Client-supplied user IDs are not used for authorization.

## Firestore Isolation

User data is stored beneath user-specific Firestore paths.

The security rules enforce ownership using the authenticated Firebase UID:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string &&
             id.size() <= 128 &&
             id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    match /users/{userId}/entries/{entryId} {
      allow read: if isOwner(userId);

      allow create: if isOwner(userId)
                    && isValidId(entryId)
                    && request.resource.data.userId == userId
                    && request.resource.data.content is string
                    && request.resource.data.content.size() <= 50000
                    && request.resource.data.isGeminiPrivate is bool;

      allow update: if isOwner(userId)
                    && isValidId(entryId)
                    && request.resource.data.userId == userId
                    && request.resource.data.content is string
                    && request.resource.data.content.size() <= 50000
                    && request.resource.data.isGeminiPrivate is bool;

      allow delete: if isOwner(userId) && isValidId(entryId);
    }

    match /users/{userId}/conversations/{conversationId} {
      allow read: if isOwner(userId);

      allow create: if isOwner(userId)
                    && isValidId(conversationId)
                    && request.resource.data.userId == userId;

      allow update: if isOwner(userId)
                    && isValidId(conversationId)
                    && request.resource.data.userId == userId;

      allow delete: if isOwner(userId) && isValidId(conversationId);
    }

    match /users/{userId}/preferences/{prefId} {
      allow read, write: if isOwner(userId) && isValidId(prefId);
    }

    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if isOwner(userId) && isValidId(interactionId);
    }
  }
}
```

Deploy the rules:

```bash
firebase deploy --only firestore:rules
```

---

## 🔒 AI Privacy Firewall

Every journal entry can be classified using:

```text
isGeminiPrivate: true
```

When an entry is marked **Keep Private**:

* It remains stored in the user's journal.
* It is excluded from Gemini context.
* It is excluded from reflection scopes.
* It remains excluded even when using **Entire Eligible Vault**.
* The server verifies the authoritative privacy state before constructing Gemini context.

The client cannot override an entry's authoritative private state.

---

# 🧠 Memory & Reflection

## Reflection Scopes

Users can choose:

* **Entire Eligible Vault** — all non-private memories.
* **Specific Thoughts** — selected journal entries.
* **By Label** — memories matching a selected label.
* **Current Thought Only** — only the current eligible entry.

Private thoughts are automatically excluded from every scope.

## Recurring Themes

The Memory Vault can identify recurring themes across eligible journal entries.

Themes are grounded in the user's stored memories and can reference the supporting entries that contributed to the theme.

This feature is intended for personal reflection and does not provide clinical or diagnostic conclusions.

---

# 🚀 Local Development

## Prerequisites

* Node.js
* npm
* Firebase project
* Firebase Authentication
* Google Sign-In enabled
* Cloud Firestore
* Gemini API access
* Firebase CLI

## 1. Clone the repository

```bash
git clone https://github.com/vaenkat/ai-memory-vault.git
cd ai-memory-vault
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create your local environment configuration using `.env.example`.

The Gemini API key must remain server-side.

Never commit:

* `.env`
* `.env.local`
* Gemini API keys
* Firebase Admin credentials
* service-account JSON files

## 4. Configure Firebase

Enable:

* Firebase Authentication
* Google Sign-In
* Cloud Firestore

Add the hostname used by your development environment to Firebase Authentication's authorized domains.

## 5. Start the application

```bash
npm run dev
```

---

# ☁️ Google Cloud Run Deployment

The challenge's intended production deployment target is **Google Cloud Run**.

## 1. Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

## 2. Create the Gemini secret

```bash
gcloud secrets create GEMINI_API_KEY \
  --replication-policy="automatic"
```

Add the API key:

```bash
echo -n "YOUR_GEMINI_API_KEY" | \
gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

Grant the Cloud Run runtime service account access:

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

## 3. Deploy to Cloud Run

```bash
gcloud run deploy personal-gemini-journal \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

Adjust the region and service account to match your Google Cloud project.

## 4. Apply the challenge verification label

The required label is:

```text
dev-tutorial=cloud-run-ai-challenge
```

Apply it with:

```bash
gcloud run services update personal-gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region asia-east1
```

Verify:

```bash
gcloud run services describe personal-gemini-journal \
  --region asia-east1 \
  --format="value(metadata.labels)"
```

---

# 🧪 Verification

The application was tested against the following scenarios.

### Authentication

* Google Sign-In
* Missing authentication token
* Invalid or tampered token
* Spoofed client user ID
* Server-side Firebase identity verification

### Privacy Firewall

* Private entry excluded from Gemini
* Mixed public/private context
* Client-side privacy override attempt
* Public → private state change
* Private → public state change
* Authoritative Firestore privacy verification

### Application Functionality

* Journal creation and persistence
* Today editor reset after successful save
* Memory Vault browsing
* Memory filtering
* Gemini multi-turn reflection
* Quick Reflection
* Reflection scope selection
* Recurring theme analysis
* Conversation persistence
* Export
* Delete

---

# 📁 Repository Structure

```text
.
├── src/
│   ├── components/
│   ├── lib/
│   └── ...
├── server.ts
├── firestore.rules
├── .env.example
├── package.json
├── package-lock.json
└── README.md
```

---

# 🎯 Challenge Context

This project was created for the **Google Cloud Run AI Challenge** as part of the Google Cloud Gen AI Academy APAC program.

The project started from the Personal Gemini Journal baseline and extends it with:

* Persistent personal memory
* User-controlled AI access
* Server-enforced privacy boundaries
* Evidence-backed recurring themes
* Multi-scope reflection
* Security-focused authentication and authorization

The application was developed using **Google AI Studio** with security-focused development instructions covering threat modeling, secure coding, authentication, database isolation, secret management, and verification.

---


## ⚠️ Security Notice

Never commit production credentials or secrets to this repository.

The Gemini API key must remain server-side and should be supplied through a secure secret-management mechanism such as Google Cloud Secret Manager.

Firebase client configuration should not be treated as a server-side secret.

---

# 📜 License

Copyright © 2026 Akula Vaenkata Saye Chandan. All rights reserved.

This project is provided for demonstration and evaluation purposes only.
Unauthorized copying, modification, redistribution, or commercial use of this
code is not permitted without prior written permission from the author.
