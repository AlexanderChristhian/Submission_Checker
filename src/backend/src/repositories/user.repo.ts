import { prisma } from "../config/database.js";

export const userRepo = {
  async findAll() {
    return prisma.user.findMany({
      include: { submissions: true },
      orderBy: { id: "desc" },
    });
  },

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { submissions: true },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async create(data: { email: string; name: string; role?: "STUDENT" | "LECTURER" | "ADMIN" }) {
    return prisma.user.create({ data });
  },

  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  },
};
