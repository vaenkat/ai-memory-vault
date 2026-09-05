# Personal Gemini Journal — AI Memory Vault

A secure, user-authenticated personal journaling and reflection application built with Google Gemini, Firebase Authentication, Cloud Firestore, and Google Cloud Secret Manager.

Built for the **Google Cloud Run AI Challenge**, featuring:
- **Zero-Trust Architecture**: Federated Google Identity with no passwords stored.
- **Owner-Bound Database Isolation**: Cloud Firestore with strict security rules enforcing user data isolation.
- **AI Privacy Firewall**: Dual-layer client and server-side filtering ensuring private entries are never sent to Gemini.
- **Model Resilience Ladder**: Automated fallback protocol (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`).
- **Grounded Recurring Life Themes**: Thematic synthesis referencing actual journal entries without clinical or diagnostic claims.

---

## 1. Prerequisites & Cloud APIs

Ensure the following Google Cloud APIs are enabled in your GCP project:

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

---

## 2. Secret Management Setup (Google Cloud Secret Manager)

To eliminate hardcoded API keys and credentials, store the `GEMINI_API_KEY` in Google Cloud Secret Manager:

```bash
# 1. Create the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your Gemini API key value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the default Cloud Run runtime service account permission to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Cloud Firestore Security Rules

Deploy the owner-bound security rules to ensure strict data isolation where users can only read and write their own documents:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Default-deny all queries and documents
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
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    // User-isolated Journal Entries
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

    // User-isolated Conversations & Reflections
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

    // User-isolated Preferences & Settings
    match /users/{userId}/preferences/{prefId} {
      allow read, write: if isOwner(userId) && isValidId(prefId);
    }

    // User-isolated Interactions (Compliance & Telemetry)
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if isOwner(userId) && isValidId(interactionId);
    }
  }
}
```

Deploy the rules using the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

## 4. Google Cloud Run Deployment

Deploy the containerized full-stack application to Cloud Run, injecting the `GEMINI_API_KEY` directly from Secret Manager:

```bash
gcloud run deploy personal-gemini-journal \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

---

## 5. Mandatory Campaign Verification Binding

To register the service for automated challenge verification, apply the mandatory resource label:

```bash
gcloud run services update personal-gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region asia-east1
```

Verify that the label is present:

```bash
gcloud run services describe personal-gemini-journal \
  --region asia-east1 \
  --format="value(metadata.labels)"
```

---

## 6. Functional Verification Walkthrough

Follow these sequential steps to test all features:

### Test Case 1: Federated Google Authentication
1. Navigate to the application root.
2. Confirm the unauthenticated landing page displays the zero-trust security overview.
3. Click **Sign in with Google**.
4. Complete the popup authorization.
5. Confirm the UI renders the authenticated navigation bar and your user avatar.

### Test Case 2: Writing & Privacy Classification in "Today"
1. In the **Today** view, type a title and journal entry.
2. Select a mood chip (e.g. *Reflective*).
3. Toggle the **Mark as 🔒 Private** button.
4. Verify the banner changes to **"🔒 Private — Gemini will NEVER access this entry"** with the **FIREWALL ACTIVE** badge.
5. Click **Save Changes**.
6. Verify the confirmation toast appears and the entry is stored in Firestore under `/users/{userId}/entries/{entryId}`.

### Test Case 3: AI Privacy Firewall Enforcement
1. Attempt to click **Reflect with AI** on the private entry.
2. Confirm the button is disabled or prevented with the explanation that private entries are barred from Gemini.
3. Toggle off the private flag and click **Reflect with AI**.
4. Confirm navigation to the **Reflect** tab with the active context loaded.

### Test Case 4: Multi-Turn Conversation & Model Fallback Ladder
1. In the **Reflect** tab, ask a question (e.g. *"What questions should I explore based on this reflection?"*).
2. Confirm the Gemini response streams/renders in clean markdown.
3. Check the model badge (e.g. `gemini-3.6-flash`).
4. Enter a follow-up message to verify multi-turn context retention.
5. Check that the conversation is persisted in Firestore under `/users/{userId}/conversations/{conversationId}`.

### Test Case 5: Memory Vault Browsing & Recurring Themes
1. Switch to the **Memories** tab.
2. Verify all saved entries are visible.
3. Use the search bar and filter toggles (*All*, *AI Eligible*, *🔒 Private*).
4. Click **Discover Recurring Themes**.
5. Verify the evidence-backed theme cards render (e.g. *"Mentioned in X entries"*).
6. Click a theme card to filter supporting journal entries.

### Test Case 6: Privacy Center & Data Portability
1. Switch to the **Privacy** tab.
2. Verify the 4 architecture cards (Firewall, Firestore Isolation, Federated Identity, Secret Management) show active status.
3. Click **Export Archive (JSON)** and **Export as Markdown**; verify downloads.
4. Test the **Wipe All Data** workflow with safety confirmation.
