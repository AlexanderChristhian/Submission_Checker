import { PrismaClient } from "../../generated/prisma/client.js";
import { config } from "./index.js";
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasourceUrl: config.DATABASE_URL
});
if (process.env["NODE_ENV"] !== "production") {
    globalForPrisma.prisma = prisma;
}
//# sourceMappingURL=database.js.map