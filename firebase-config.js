// Replace the placeholder values with your Firebase project's Web app config.
// Firebase Console → Project settings → Your apps → SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Use the same collection/document for every visitor to share one tracker.
export const trackerPath = {
  collection: "dragonPrinceTrackers",
  document: "united-arab-emirates"
};
