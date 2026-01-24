# Firebase Hosting Setup Guide

This guide will help you set up CI/CD deployment to Firebase Hosting for the `simple-milktea` branch.

## Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Firebase CLI installed locally (optional, for testing)
3. GitHub repository with Actions enabled

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Note your **Project ID** (you'll need this later)

## Step 2: Enable Firebase Hosting

1. In your Firebase project, go to **Hosting** in the left sidebar
2. Click "Get started"
3. Follow the setup wizard (you can skip the CLI commands for now)

## Step 3: Get Firebase Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Find the Firebase Admin SDK service account (usually named like `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`)
5. Click on it, then go to the **Keys** tab
6. Click **Add Key** > **Create new key**
7. Choose **JSON** format
8. Download the JSON file

## Step 4: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** and add the following:

### Required Secrets:

1. **FIREBASE_PROJECT_ID**
   - Name: `FIREBASE_PROJECT_ID`
   - Value: Your Firebase project ID (e.g., `my-project-12345`)

2. **FIREBASE_SERVICE_ACCOUNT**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: The entire contents of the JSON service account key file you downloaded
   - ⚠️ **Important**: Paste the entire JSON object as a single string

## Step 5: Update Firebase Configuration

1. Update `.firebaserc` with your actual Firebase project ID:
   ```json
   {
     "projects": {
       "default": "your-actual-project-id"
     },
     "targets": {
       "your-actual-project-id": {
         "hosting": {
           "simple-milktea": [
             "your-actual-project-id"
           ]
         }
       }
     }
   }
   ```

2. The `firebase.json` is already configured to deploy from `vue-app/dist`

## Step 6: Test the Workflow

1. Make a change to any file in the `vue-app` directory
2. Commit and push to the `simple-milktea` branch:
   ```bash
   git add .
   git commit -m "Test Firebase deployment"
   git push origin simple-milktea
   ```

3. Go to your GitHub repository > **Actions** tab
4. You should see the workflow running
5. Once complete, check your Firebase Hosting dashboard for the deployed site

## Workflow Details

The GitHub Actions workflow (`/.github/workflows/firebase-deploy.yml`) will:

- **Trigger**: Automatically on pushes to `simple-milktea` branch when files in `vue-app/` change
- **Build**: Install dependencies and build the Vue app
- **Deploy**: Deploy the built app to Firebase Hosting

## Manual Deployment (Optional)

If you want to test deployment locally:

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize (if not already done)
cd vue-app
firebase init hosting

# Build the app
npm run build

# Deploy
firebase deploy --only hosting
```

## Troubleshooting

### Workflow fails with "Project not found"
- Verify `FIREBASE_PROJECT_ID` secret matches your actual project ID
- Check that the project exists in Firebase Console

### Workflow fails with "Permission denied"
- Verify the service account JSON is correctly pasted in `FIREBASE_SERVICE_ACCOUNT` secret
- Ensure the service account has "Firebase Hosting Admin" role

### Build fails
- Check that all dependencies in `vue-app/package.json` are correct
- Verify Node.js version in workflow matches your local environment

### Deployment succeeds but site shows 404
- Check `firebase.json` configuration
- Verify the `public` path points to `vue-app/dist`
- Ensure the rewrite rule for SPA routing is correct

## Support

For more information:
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase GitHub Action](https://github.com/FirebaseExtended/action-hosting-deploy)
