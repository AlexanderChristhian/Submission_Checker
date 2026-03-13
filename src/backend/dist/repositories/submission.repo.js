import { prisma } from "../config/database.js";
export const submissionRepo = {
    async findAll() {
        return prisma.submission.findMany({
            include: { student: true },
            orderBy: { id: "desc" },
        });
    },
    async findById(id) {
        return prisma.submission.findUnique({
            where: { id },
            include: { student: true },
        });
    },
    async create(data) {
        return prisma.submission.create({
            data: {
                title: data.title,
                content: data.content,
                studentId: data.studentId,
            },
            include: { student: true },
        });
    },
    async update(id, data) {
        return prisma.submission.update({
            where: { id },
            data,
            include: { student: true },
        });
    },
    async delete(id) {
        return prisma.submission.delete({ where: { id } });
    },
};
//# sourceMappingURL=submission.repo.js.map