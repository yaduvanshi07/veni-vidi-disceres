# Deployment Guide for Render.com

This guide contains the step-by-step instructions to deploy your Document Assistant application to Render. 

A `render.yaml` Blueprint file has already been added to your project's root directory. This makes the setup practically automatic!

## Step 1: Set up your Cloud Database (MongoDB Atlas)

Currently, the app connects to a local MongoDB database (`mongodb://localhost:27017`). Render does not run MongoDB instances, so you'll need to use a free cloud database instead.

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create an account.
2. Build a free **M0 Cluster**.
3. Under the **Database Access** side menu, click "Add New Database User" and create a user with a Username and Password. (Save this password as you'll need it).
4. Under the **Network Access** side menu, click "Add IP Address" and select "Allow Access From Anywhere" (`0.0.0.0/0`). This allows Render's dynamic IPs to connect to your database.
5. Click **Connect** on your cluster, select **Connect your application**, and copy the connection string.
   - Example string: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/document-assistant?retryWrites=true&w=majority`
   - Be sure to replace `<password>` with the password you just created.

## Step 2: Push your code to GitHub

Render needs to pull your source code from a remote Git repository to deploy it. If your project is not already on GitHub, do the following:

1. Create a new empty repository on your GitHub account.
2. Run the following commands in your project terminal:
   ```bash
   git add .
   git commit -m "Prepare for Render deploy"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

## Step 3: Deploy via Render Dashboard

Because your project now contains a `render.yaml` file, deploying is very simple.

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click the **New** button and select **Blueprint**.
3. Connect your GitHub account and select your project's repository.
4. Render will read instructions from the `render.yaml` file and will only ask you to provide the values for the secrets the application needs. It will ask for:
   - **`MONGODB_URI`**: Paste the connection string you got from MongoDB Atlas in Step 1.
   - **`GEMINI_API_KEY`**: Paste your Google Gemini API key here.
5. Click **Apply Component**. Render will now automatically run `npm install`, build out your server space, and then start your application via `npm start`.

## ⚠️ Important Note Regarding User Avatars/File Uploads

By default, Render's Free tier uses an **ephemeral filesystem**. This means that the hard drive is temporary. Whenever Render restarts your server (due to sleep intervals, new deployments, or maintenance), the `uploads/` folder is totally wiped out.

If users upload PDFs, documents, or images and then your site goes to sleep on the Free tier, those documents will be missing when the server wakes up.

**How to solve this long-term:**
1. **Refactor Code (Best/Free approach):** Rework the logic in `routes/documents.js` to upload files directly to Cloudinary, AWS S3, or Google Cloud Storage.
2. **Paid Upgrade (Easiest approach):** Upgrade to Render's paid Starter plan, and edit `render.yaml` to include a persistent disk volume.
