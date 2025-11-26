// 这里只保留「纯前端可用」的工具函数，不再引入数据库或 bcrypt，
// 这样在客户端组件中引用时不会触发 DATABASE_URL 相关的错误。

// 格式化日期
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 解析标签
export function parseTags(tagsStr?: string | null): string[] {
  if (!tagsStr) return [];
  return tagsStr
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);
}

// 序列化标签
export function serializeTags(tags: string[]): string {
  return tags.join(",");
}

