# ⚡ Quick Start Guide

Get your portfolio up and running in 5 minutes!

## 1️⃣ Install Dependencies

```bash
npm install --legacy-peer-deps
```

## 2️⃣ Set Up Database

### Get Neon Database URL

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Create a new project
3. Copy your connection string

### Create .env.local

Create a file named `.env.local` in the project root:

```bash
DATABASE_URL=postgres://username:password@ep-xxxxx.region.aws.neon.tech/neondb
```

Replace with your actual Neon connection string.

## 3️⃣ Initialize Database

### Option A: Using SQL (Recommended)

1. Go to Neon Console → SQL Editor
2. Copy contents from `scripts/init-db.sql`
3. Paste and run

### Option B: Using API (After starting dev server)

```bash
# Start dev server first
npm run dev

# Then visit in browser:
http://localhost:3000/api/init
```

## 4️⃣ Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5️⃣ Login to Admin Panel

1. Go to [http://localhost:3000/manage](http://localhost:3000/manage)
2. Click "Login"
3. Use default credentials:
   - **Username**: `admin`
   - **Password**: `asdf7896`

## 6️⃣ Create Your First Blog Post

1. In the admin panel, click "New Post"
2. Fill in:
   - Title: "My First Post"
   - Description: "This is my first blog post"
   - Content: Write something using the rich text editor
   - Image URL: (optional) `https://picsum.photos/800/400`
   - Tags: Add some tags like "test", "first-post"
3. Make sure "Publish immediately" is checked
4. Click "Create"

## 7️⃣ View Your Blog

Go to [http://localhost:3000/blog](http://localhost:3000/blog) to see your post!

## 8️⃣ Customize Personal Info

Edit `app/page.tsx` and update:

```typescript
const personalInfo = {
  name: "Your Name",
  title: "Your Title",
  email: "your@email.com",
  phone: "+64 21 XXX XXXX",
  // ... more fields
};
```

Also update:
- Work experience in `workExperience` array
- Education in `education` array
- Skills in `personalInfo.skills` array

## 🎨 Customize Styling

All colors and styles are in `app/globals.css` using CSS variables:

```css
:root {
  --color-primary: #3b82f6;  /* Change primary color */
  --color-secondary: #8b5cf6; /* Change secondary color */
  /* ... more variables */
}
```

## 📝 Common Tasks

### Add a New Blog Post
1. Go to `/manage`
2. Click "New Post"
3. Fill in details
4. Click "Create"

### Edit a Blog Post
1. Go to `/manage`
2. Click "Edit" on any post
3. Make changes
4. Click "Update"

### Delete a Blog Post
1. Go to `/manage`
2. Click "Delete" on any post
3. Confirm deletion

## 🚀 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add DATABASE_URL environment variable
vercel env add DATABASE_URL

# Deploy to production
vercel --prod
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Useful Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Generate database migrations
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## 🆘 Troubleshooting

### "DATABASE_URL is not defined"
- Make sure `.env.local` exists in the project root
- Check that the file contains `DATABASE_URL=...`
- Restart the dev server

### "relation 'posts' does not exist"
- You need to initialize the database
- Run the SQL from `scripts/init-db.sql` in Neon Console
- Or visit `http://localhost:3000/api/init`

### Can't login
- Make sure you initialized the database
- Default credentials are: `admin` / `asdf7896`
- Check browser console for errors

### React Quill errors
- This is normal during development
- The editor is loaded dynamically to avoid SSR issues
- Errors should not appear in production build

### Build fails with peer dependency errors
- Always use `npm install --legacy-peer-deps`
- This is needed because react-quill doesn't support React 19 yet

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [React Quill Documentation](https://github.com/zenoamaro/react-quill)

## 💡 Tips

1. **Use good images**: Your blog posts look better with nice images
   - Try [Unsplash](https://unsplash.com) for free stock photos
   - Use [TinyPNG](https://tinypng.com) to optimize images

2. **Write good descriptions**: They appear in the blog list preview

3. **Use tags**: They help organize your posts

4. **Test on mobile**: The site is responsive, but always test

5. **Change the default password**: Important for security!

## ✅ Checklist

Before deploying:
- [ ] Updated personal information
- [ ] Changed admin password
- [ ] Created at least one blog post
- [ ] Tested all pages
- [ ] Customized colors/styling (optional)
- [ ] Added your own images
- [ ] Tested on mobile devices

---

**You're all set! Happy blogging! 🎉**

