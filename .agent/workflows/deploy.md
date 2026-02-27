---
description: Build and deploy the application to Firebase Hosting
---

This workflow guides you through exporting the Next.js app as a static site and deploying it to Firebase.

1. Build the project
```bash
npm run build
```

2. Deploy to Firebase Hosting
```bash
npx firebase deploy --only hosting
```

> [!NOTE]
> Make sure you have the Firebase CLI installed and are logged in (`npx firebase login`).
