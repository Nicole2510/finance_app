import type { CategoryGroup } from "@prisma/client";
import { prisma } from "../db.js";

// Generic starter categories every new user gets (they can edit or archive them)
export const DEFAULT_CATEGORIES: { name: string; emoji: string; group: CategoryGroup }[] = [
  { name: "Rent", emoji: "🏠", group: "NEEDS" },
  { name: "Groceries", emoji: "🛒", group: "NEEDS" },
  { name: "Transportation", emoji: "🚌", group: "NEEDS" },
  { name: "Utilities", emoji: "💡", group: "NEEDS" },
  { name: "Phone & Internet", emoji: "📱", group: "NEEDS" },
  { name: "Health", emoji: "🩺", group: "NEEDS" },

  { name: "Dining Out", emoji: "🍽️", group: "WANTS" },
  { name: "Shopping", emoji: "🛍️", group: "WANTS" },
  { name: "Subscriptions", emoji: "📺", group: "WANTS" },
  { name: "Entertainment", emoji: "🎬", group: "WANTS" },
  { name: "Gifts", emoji: "🎁", group: "WANTS" },
  { name: "Travel", emoji: "✈️", group: "WANTS" },

  { name: "Savings", emoji: "🐷", group: "SAVINGS_DEBT" },
  { name: "Debt Payments", emoji: "💳", group: "SAVINGS_DEBT" },

  { name: "Salary", emoji: "💼", group: "INCOME" },
  { name: "Other Income", emoji: "💰", group: "INCOME" },
];

// Creates the defaults for a user who has no categories yet.
// skipDuplicates makes it safe if two requests run this at the same time.
export async function ensureDefaultCategories(userId: string) {
  const count = await prisma.category.count({ where: { userId } });
  if (count > 0) return;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
    skipDuplicates: true,
  });
}
