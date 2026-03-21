/**
 * Script to create admin user in PostgreSQL database
 * 
 * Usage:
 *   npm run create-admin
 *   or
 *   tsx script/createadmin.ts
 * 
 * Environment variables required:
 *   DATABASE_URL or POSTGRES_URL - PostgreSQL connection string
 */

import "dotenv/config";
import { withDb } from "../shared/db.js";
import { users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import { randomUUID } from "crypto";
import readline from "readline";

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask question and wait for answer
 */
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Hash password using bcryptjs (compatible with serverless login verify)
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcryptjs.hash(password, saltRounds);
}

/**
 * Create admin user in database
 */
async function createAdmin(username: string, password: string) {
  console.log("\n🔐 Хеширование пароля...");
  const hashedPassword = await hashPassword(password);

  console.log("💾 Создание пользователя в базе данных...");
  
  try {
    const user = await withDb(async (db) => {
      // Check if user already exists
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existing) {
        throw new Error(`Пользователь с логином "${username}" уже существует!`);
      }

      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          username,
          password: hashedPassword,
        })
        .returning();

      return newUser;
    });

    console.log("\n✅ Админ успешно создан!");
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log("\n💡 Теперь вы можете войти в админ-панель используя эти данные.");
  } catch (error) {
    if (error instanceof Error) {
      console.error("\n❌ Ошибка:", error.message);
    } else {
      console.error("\n❌ Неизвестная ошибка:", error);
    }
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(50));
  console.log("  Создание администратора для MyDevSite");
  console.log("=".repeat(50));

  // Check database connection
  try {
    await withDb(async (db) => {
      await db.select().from(users).limit(1);
    });
    console.log("✅ Подключение к базе данных успешно\n");
  } catch (error) {
    console.error("❌ Ошибка подключения к базе данных!");
    console.error("   Убедитесь, что DATABASE_URL или POSTGRES_URL установлены в .env");
    console.error("   Ошибка:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const rl = createReadlineInterface();

  try {
    // Get username
    const username = await askQuestion(rl, "Введите логин администратора: ");
    if (!username || username.length < 2) {
      console.error("❌ Логин должен содержать минимум 2 символа");
      process.exit(1);
    }

    // Get password
    const password = await askQuestion(rl, "Введите пароль: ");
    if (!password || password.length < 6) {
      console.error("❌ Пароль должен содержать минимум 6 символов");
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await askQuestion(rl, "Подтвердите пароль: ");
    if (password !== confirmPassword) {
      console.error("❌ Пароли не совпадают!");
      process.exit(1);
    }

    // Create admin
    await createAdmin(username, password);
  } finally {
    rl.close();
  }
}

// Run script
main().catch((error) => {
  console.error("❌ Критическая ошибка:", error);
  process.exit(1);
});
