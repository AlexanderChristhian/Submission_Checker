import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
const app = express();
// Global middleware
app.use(cors());
app.use(express.json());
// Better Auth handler
const authHandler = toNodeHandler(auth);
app.all("/api/auth/*path", (req, res) => authHandler(req, res));
// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// API routes
app.use("/api", routes);
// Error handling (must be last)
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map