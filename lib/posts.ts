import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";

export type BlogPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
};

type CreatePostInput = {
  title: string;
  summary: string;
  content: string;
  publishedAt?: Date | string;
};

const ensureDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined. Please set it to your Neon connection string.");
  }
  return process.env.DATABASE_URL;
};

const getSqlClient = () => neon(ensureDatabaseUrl());

let tableEnsured = false;

const ensureTable = async () => {
  const sql = getSqlClient();
  if (!tableEnsured) {
    await sql`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    tableEnsured = true;
  }
  return sql;
};

const mapRow = (row: any): BlogPost => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  content: row.content,
  publishedAt: new Date(row.published_at).toISOString(),
});

export async function listPosts(limit?: number): Promise<BlogPost[]> {
  const sql = await ensureTable();
  const results = limit
    ? await sql`
        SELECT id, title, summary, content, published_at
        FROM blog_posts
        ORDER BY published_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT id, title, summary, content, published_at
        FROM blog_posts
        ORDER BY published_at DESC
      `;

  return results.map(mapRow);
}

export async function createPost(input: CreatePostInput): Promise<BlogPost> {
  const sql = await ensureTable();
  const timestamp =
    input.publishedAt instanceof Date
      ? input.publishedAt
      : input.publishedAt
      ? new Date(input.publishedAt)
      : new Date();

  const [row] = await sql`
    INSERT INTO blog_posts (id, title, summary, content, published_at)
    VALUES (${randomUUID()}, ${input.title}, ${input.summary}, ${input.content}, ${timestamp})
    RETURNING id, title, summary, content, published_at
  `;

  return mapRow(row);
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const sql = await ensureTable();
  const [row] =
    await sql`SELECT id, title, summary, content, published_at FROM blog_posts WHERE id = ${id}`;
  return row ? mapRow(row) : null;
}

