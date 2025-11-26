import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, User } from "../db";

// 初始化数据库，创建默认 admin 用户（仅在服务端使用）
export async function initializeDatabase() {
  try {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"));

    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("asdf7896", 10);
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        role: "admin",
      });
      console.log("Admin user created successfully");
    }

    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
}

// 验证用户登录（仅在服务端使用）
export async function verifyUser(
  username: string,
  password: string
): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    console.log('test4', result);
    if (result.length === 0) return null;

    const user = result[0];
    // const isValid = await bcrypt.compare(password, user.password);
    // console.log('test5', isValid);
    // if (!isValid) return null;

    return user;
  } catch (error) {
    console.error("Error verifying user:", error);
    return null;
  }
}


