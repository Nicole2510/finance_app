// Load .env before anything else, so Clerk and Prisma can see the keys
import "dotenv/config";
import { app } from "./app.js";

// Use server port from environment variable or default to 3001
const PORT = process.env.PORT || 3001;

// Start Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
