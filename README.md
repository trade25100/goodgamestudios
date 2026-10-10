# Dragon Prince Coordinates

A static GitHub Pages tracker with fixed coordinates, editable appearance dates, status tracking, Markdown export, and optional Firebase/Cloud Firestore real-time synchronization.

## Files

- `index.html` — page structure
- `style.css` — responsive dark theme
- `app.js` — coordinate grid, status/date editing, Markdown export, Firestore sync
- `firebase-config.js` — your Firebase web-app configuration

## Deploy to GitHub Pages

1. Create or open your GitHub repository.
2. Upload all four files to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select your branch (usually `main`) and folder `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site.

## Enable real-time sharing with Firebase

1. Open the Firebase Console and create a project.
2. Register a Web app in **Project settings → General → Your apps**.
3. Copy the Firebase web configuration into `firebase-config.js`, replacing every `YOUR_...` placeholder.
4. In **Build → Firestore Database**, create a database.
5. Configure Firestore security rules before sharing the public website.
6. Reload the GitHub Pages website. The connection indicator should show **Live sync connected**.

The app uses one shared document at `dragonPrinceTrackers/united-arab-emirates`. Every visitor using this config shares the same status and appearance-date data.

### Important security note

Do not deploy a publicly writable Firestore database with unrestricted rules. Anyone who knows the project configuration could modify the shared tracker. For a public site, consider Firebase Authentication, restricting writes to approved users, and Firebase App Check. Firebase client configuration is visible in the browser by design; security must be enforced by Firestore Rules, not by hiding the config.

## Local demo mode

If `firebase-config.js` still contains placeholders, the page works in local demo mode. Changes are stored in that browser only and are not shared with other users.

## Coordinate statuses

The app preserves the initial statuses supplied in the original table. Coordinates are generated from the fixed axis values `575, 594, 614, 633, 653, 672, 692, 711`; coordinate labels cannot be edited. Dates are entered manually using the browser's date/time picker.

## Markdown export

Use **Export Markdown** to preview the current tracker as Markdown, or **Copy Markdown** to copy it into the clipboard for your README.
