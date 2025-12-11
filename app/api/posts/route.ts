import { NextResponse } from 'next/server';
import { db, posts } from '@/lib/db';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt));

    return NextResponse.json(allPosts);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title, description, content, imageUrl, tags, link, isPublished,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 },
      );
    }

    const result = await db
      .insert(posts)
      .values({
        title,
        description,
        content,
        imageUrl,
        tags,
        link,
        isPublished: isPublished ?? true,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
