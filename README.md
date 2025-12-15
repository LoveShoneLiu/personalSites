# Personal Portfolio & Blog

A modern, beautiful personal portfolio website with a blog management system, built with Next.js 15, TypeScript, and Neon Postgres.

## 🌟 Features

- **Modern Design**: Beautiful, responsive UI with smooth animations
- **SSG Homepage**: Static generated personal portfolio with work experience and education
- **ISR Blog**: Incremental Static Regeneration for blog posts with waterfall layout
- **CSR Blog Details**: Client-side rendered blog post details
- **Admin Panel**: Full-featured blog management with rich text editor
- **Authentication**: Secure admin login system
- **Database**: Powered by Neon serverless Postgres with Drizzle ORM

## 📋 Pages

1. **/** - Homepage (SSG)
   - Personal information
   - Work experience
   - Education background
   - Skills showcase

2. **/blog** - Blog List (ISR, revalidates every 60s)
   - Waterfall/masonry layout
   - Post previews with images, tags, and descriptions
   - Click to view full post

3. **/bloginfo/[id]** - Blog Details (CSR)
   - Full blog post content
   - Rich text rendering
   - External links support

4. **/manage** - Admin Panel (CSR, login required)
   - Create, edit, delete blog posts
   - Rich text editor (ReactQuill)
   - Image upload support
   - Tags management
   - Publish/draft status

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- A Neon database account (free tier available)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd personalSites
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Neon database connection string:
```
DATABASE_URL=postgres://username:password@ep-xxxxx.region.aws.neon.tech/neondb
```

4. Initialize the database:
```bash
npm run db:push
```

Or manually create tables by visiting: `http://localhost:3000/api/init`

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your site.

## 🔐 Admin Access

Default admin credentials:
- **Username**: admin
- **Password**: asdf7896

⚠️ **Important**: Change these credentials in production!

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Neon Postgres (Serverless)
- **ORM**: Drizzle ORM
- **Styling**: SCSS Modules + CSS Variables
- **Rich Text Editor**: ReactQuill
- **Animations**: Framer Motion
- **Authentication**: bcryptjs + sessionStorage

## 🗄️ Database Schema

### Users Table
- id (serial, primary key)
- username (varchar, unique)
- password (varchar, hashed)
- email (varchar)
- role (varchar, default: 'user')
- createdAt (timestamp)

### Posts Table
- id (serial, primary key)
- title (varchar)
- description (text)
- content (text)
- imageUrl (varchar)
- tags (text, comma-separated)
- link (varchar)
- isPublished (boolean)
- createdAt (timestamp)
- updatedAt (timestamp)

## 🎨 Customization

### Personal Information

Edit `/app/page.tsx` to update:
- Personal details (name, email, phone, location)
- Work experience
- Education background
- Skills
- Social links

### Styling

Global styles are in `/app/globals.css` with CSS variables for easy theming:
- Colors
- Spacing
- Typography
- Shadows
- Border radius
- Transitions

## 📱 Responsive Design

The site is fully responsive and optimized for:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add your `DATABASE_URL` environment variable
4. Deploy!

The site will automatically:
- Build static pages (homepage)
- Set up ISR for blog list
- Enable CSR for dynamic pages

### Environment Variables

Make sure to set these in your deployment platform:
```
DATABASE_URL=your_neon_connection_string
```

## 📝 API Routes

- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `GET /api/posts/[id]` - Get a specific post
- `PUT /api/posts/[id]` - Update a post
- `DELETE /api/posts/[id]` - Delete a post
- `POST /api/auth/login` - Admin login
- `GET /api/init` - Initialize database (create tables and admin user)

## 🔧 Development Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Generate database migrations
npx drizzle-kit generate

# Push schema to database
npx drizzle-kit push
```

## 🤝 Contributing

This is a personal portfolio project, but feel free to fork and customize it for your own use!

## 📄 License

MIT License - feel free to use this project for your own portfolio.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database by [Neon](https://neon.tech/)
- Icons from Unicode Emoji
- Inspired by modern portfolio designs

---

**Made with ❤️ for job hunting in New Zealand**
