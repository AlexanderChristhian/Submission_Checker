import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().default("http://localhost:3000"),
    NEO4J_URI: z.string().default("bolt://localhost:7687"),
    NEO4J_USER: z.string().default("neo4j"),
    NEO4J_PASSWORD: z.string().default("password"),
    RAG_SERVICE_URL: z.string().default("http://localhost:8000"),
});
export const config = envSchema.parse(process.env);
//# sourceMappingURL=index.js.map