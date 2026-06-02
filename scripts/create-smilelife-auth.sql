-- SmileLife 登录接口专用用户表，和本站后台 users 表互不关联。
CREATE TABLE IF NOT EXISTS smilelife_auth_users (
  id serial PRIMARY KEY,
  email varchar(255) UNIQUE,
  phone varchar(50) UNIQUE,
  password_hash varchar(255) NOT NULL,
  status varchar(50) DEFAULT 'active' NOT NULL,
  last_login_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 默认测试账号：alex@smilelife.co.nz / Smile123。
-- password_hash 是 Smile123 的 bcrypt hash，数据库中不保存明文密码。
INSERT INTO smilelife_auth_users (
  email,
  password_hash,
  status,
  created_at,
  updated_at
) VALUES (
  'alex@smilelife.co.nz',
  '$2a$10$r3Fvdo2N3AU0TnaNidd3DebuJB69k/Giap01GD.huz0hFcbrWoo1.',
  'active',
  now(),
  now()
)
-- 重复执行脚本时更新默认账号，避免插入重复邮箱。
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  status = EXCLUDED.status,
  updated_at = now();
