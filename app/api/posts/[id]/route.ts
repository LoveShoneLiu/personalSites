import { NextRequest, NextResponse } from 'next/server';
import { db, posts } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const postId = parseInt(params.id, 10);

    if (Number.isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 },
      );
    }

    const result = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const postId = parseInt(params.id, 10);

    if (Number.isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const {
      title, description, content, imageUrl, tags, link, isPublished,
    } = body;

    const result = await db
      .update(posts)
      .set({
        title,
        description,
        content,
        imageUrl,
        tags,
        link,
        isPublished,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const postId = parseInt(params.id, 10);

    if (Number.isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 },
      );
    }

    const result = await db
      .delete(posts)
      .where(eq(posts.id, postId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
