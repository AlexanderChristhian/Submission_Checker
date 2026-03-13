import { prisma } from "../config/database.js";
export const studentRepo = {
    async findAll() {
        return prisma.student.findMany({
            include: { submissions: true },
            orderBy: { id: "desc" },
        });
    },
    async findById(id) {
        return prisma.student.findUnique({
            where: { id },
            include: { submissions: true },
        });
    },
    async findByFilename(filename) {
        return prisma.student.findUnique({
            where: { filename },
            include: { submissions: true },
        });
    },
    async create(data) {
        return prisma.student.create({ data });
    },
    async delete(id) {
        return prisma.student.delete({ where: { id } });
    },
};
//# sourceMappingURL=student.repo.js.map