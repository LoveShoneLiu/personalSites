# 🚀 Deployment Guide

This guide will help you deploy your personal portfolio website to Vercel with Neon database.

## Prerequisites

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account
- A [Neon](https://neon.tech) account (free tier available)

## Step 1: Set Up Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project or use an existing one
3. Copy your connection string (it looks like this):
   ```
   postgres://username:password@ep-xxxxx.region.aws.neon.tech/neondb
   ```
4. Keep this connection string safe - you'll need it later

## Step 2: Initialize Database Tables

### Option A: Using the SQL Editor in Neon Console

1. Go to your Neon project dashboard
2. Click on "SQL Editor"
3. Copy and paste the contents of `scripts/init-db.sql`
4. Click "Run" to execute the SQL

### Option B: Using the API endpoint (after deployment)

After deploying to Vercel, visit:
```
https://your-site.vercel.app/api/init
```

This will automatically create the tables and the default admin user.

## Step 3: Push to GitHub

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a new repository on GitHub

3. Push your code:
```bash
git remote add origin https://github.com/yourusername/your-repo.git
git branch -M main
git push -u origin main
```

## Step 4: Deploy to Vercel

### Via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure your project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install --legacy-peer-deps`

5. Add Environment Variable:
   - Click "Environment Variables"
   - Add: `DATABASE_URL` = your Neon connection string
   - Make sure it's available for Production, Preview, and Development

6. Click "Deploy"

### Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variable
vercel env add DATABASE_URL

# Paste your Neon connection string when prompted

# Deploy to production
vercel --prod
```

## Step 5: Initialize the Database

After deployment, visit:
```
https://your-site.vercel.app/api/init
```

This will:
- Create the database tables (if using Option B)
- Create the default admin user

You should see:
```json
{"message": "Database initialized successfully"}
```

## Step 6: Test Your Site

1. Visit your homepage: `https://your-site.vercel.app`
2. Check the blog page: `https://your-site.vercel.app/blog`
3. Try logging in: `https://your-site.vercel.app/manage`
   - Username: `admin`
   - Password: `asdf7896`

## Step 7: Customize Your Content

### Update Personal Information

Edit `/app/page.tsx`:
- Change name, email, phone, location
- Update work experience
- Update education background
- Update skills
- Update social links

### Create Your First Blog Post

1. Go to `/manage`
2. Login with admin credentials
3. Click "New Post"
4. Fill in the details:
   - Title
   - Description
   - Content (use the rich text editor)
   - Image URL (optional)
   - Tags (optional)
   - External link (optional)
5. Click "Create"

## Step 8: Change Admin Password (Important!)

The default password is `asdf7896`. You should change it:

1. Connect to your Neon database using the SQL Editor
2. Run this SQL (replace `your_new_password` with your actual password):

```sql
-- First, you need to hash your password using bcrypt
-- Use an online bcrypt generator with 10 rounds
-- Then run:
UPDATE users 
SET password = '$2a$10$your_hashed_password_here'
WHERE username = 'admin';
```

Or create a new admin user and delete the default one:

```sql
-- Insert new admin (use a bcrypt hash generator for the password)
INSERT INTO users (username, password, email, role)
VALUES ('your_username', '$2a$10$your_hashed_password', 'your@email.com', 'admin');

-- Delete default admin
DELETE FROM users WHERE username = 'admin';
```

## Troubleshooting

### Build Fails

**Error: "relation 'posts' does not exist"**
- This is expected during build if tables don't exist yet
- The build will still succeed
- Initialize the database after deployment using `/api/init`

**Error: "DATABASE_URL is not defined"**
- Make sure you added the environment variable in Vercel
- Redeploy after adding the variable

### Can't Login

**"Invalid username or password"**
- Make sure you initialized the database
- Check if the admin user was created
- Try visiting `/api/init` again

### Blog Posts Not Showing

**Empty blog list**
- You haven't created any posts yet
- Go to `/manage` and create your first post
- Make sure "Publish immediately" is checked

### Images Not Loading

**Image URLs not working**
- Use absolute URLs (e.g., `https://example.com/image.jpg`)
- Consider using a CDN or image hosting service like:
  - [Cloudinary](https://cloudinary.com)
  - [Imgur](https://imgur.com)
  - [Unsplash](https://unsplash.com) (for stock photos)

## Performance Tips

### ISR Configuration

The blog list page uses ISR with 60-second revalidation. To change this:

Edit `/app/blog/page.tsx`:
```typescript
export const revalidate = 60; // Change to your preferred seconds
```

### Image Optimization

For better performance, consider:
1. Using Next.js Image component (already implemented)
2. Optimizing images before upload (use tools like TinyPNG)
3. Using WebP format
4. Keeping images under 500KB

### Database Optimization

For better query performance:
1. Add indexes (already included in `init-db.sql`)
2. Use Neon's connection pooling
3. Consider pagination for large datasets

## Monitoring

### Vercel Analytics

Enable Vercel Analytics for free:
1. Go to your project in Vercel
2. Click "Analytics" tab
3. Enable Web Analytics

### Neon Monitoring

Monitor your database:
1. Go to Neon Console
2. Check "Monitoring" tab
3. View query performance and connection stats

## Backup

### Database Backup

Neon provides automatic backups, but you can also:

1. Export data using Neon's SQL Editor:
```sql
-- Export posts
COPY (SELECT * FROM posts) TO STDOUT WITH CSV HEADER;

-- Export users (be careful with passwords!)
COPY (SELECT id, username, email, role, created_at FROM users) TO STDOUT WITH CSV HEADER;
```

2. Save the CSV files securely

## Custom Domain

To use your own domain:

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Add your domain
4. Update your DNS records as instructed
5. Wait for DNS propagation (can take up to 48 hours)

## Support

If you encounter issues:

1. Check [Next.js Documentation](https://nextjs.org/docs)
2. Check [Vercel Documentation](https://vercel.com/docs)
3. Check [Neon Documentation](https://neon.tech/docs)
4. Review the error logs in Vercel Dashboard

---

**Congratulations! Your portfolio is now live! 🎉**

Remember to:
- ✅ Change the default admin password
- ✅ Update personal information
- ✅ Create your first blog post
- ✅ Test all features
- ✅ Share your new portfolio!

Good luck with your job hunt in New Zealand! 🇳🇿

