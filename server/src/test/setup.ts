import { vi } from "vitest";

// Fake Clerk for tests: no network calls and no real keys needed.
// A test "signs in" by sending the header  x-test-clerk-user: <clerk id>
vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) =>
    next(),

  getAuth: (req: { headers: Record<string, string | undefined> }) => ({
    userId: req.headers["x-test-clerk-user"] ?? null,
  }),

  clerkClient: {
    users: {
      getUser: async (id: string) => ({
        id,
        firstName: "Test",
        lastName: id,
        primaryEmailAddress: { emailAddress: `${id}@example.com` },
        emailAddresses: [{ emailAddress: `${id}@example.com` }],
      }),
    },
  },
}));
