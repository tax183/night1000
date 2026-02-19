---
description: How to deploy the project to Render
---

To deploy your static game to Render, follow these steps:

1. **Push your code to GitHub/GitLab**: Ensure all your files (`index.html`, `script.js`, `style.css`, and images/audio) are in a public or private repository.
2. **Log in to Render**: Go to [render.com](https://render.com) and sign in.
3. **Create a New Static Site**:
   - Click "New +" and select **Static Site**.
4. **Connect your Repository**: Select the repository where you pushed your code.
5. **Configure Settings**:
   - **Name**: Choose a name for your game.
   - **Branch**: Select the main branch (usually `main`).
   - **Build Command**: Leave this empty (since it's a static site).
   - **Publish Directory**: Set this to `.` (the current directory) or the folder name if your files are in a subfolder.
6. **Deploy**: Click **Create Static Site**. Render will build and provide you with a live URL.
