import { NextResponse } from "next/server";
import { createPost, listPosts } from "@/lib/posts";

export async function GET() {
  try {
    const posts = await listPosts();
    console.log('posts', posts);
    debugger;
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, summary, content, publishedAt } = body ?? {};

    if (!title || !summary || !content) {
      return NextResponse.json(
        { error: "title, summary, and content are required." },
        { status: 400 }
      );
    }

    const post = await createPost({
      title,
      summary,
      content,
      publishedAt,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Failed to create post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

