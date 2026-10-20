import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

// Creates express app
const app = express();

// Use server port from environment variable or default to 3001
const PORT = process.env.PORT || 3001;

// Allow requests from the React frontend
app.use(cors({ origin: "http://localhost:5173" }));

// Start Express server 
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
