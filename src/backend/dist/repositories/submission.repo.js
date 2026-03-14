import { prisma } from "../config/database.js";
export const submissionRepo = {
    async findAll() {
        return prisma.submission.findMany({
            include: { user: true },
            orderBy: { id: "desc" },
        });
    },
    async findById(id) {
        return prisma.submission.findUnique({
            where: { id },
            include: { user: true },
        });
    },
    async create(data) {
        return prisma.submission.create({
            data: {
                title: data.title,
                content: data.content,
                userId: data.userId,
                assignmentId: data.assignmentId ?? null,
                fileName: data.fileName ?? null,
                fileUrl: data.fileUrl ?? null,
            },
            include: { user: true },
        });
    },
    async update(id, data) {
        return prisma.submission.update({
            where: { id },
            data,
            include: { user: true },
        });
    },
    async delete(id) {
        return prisma.submission.delete({ where: { id } });
    },
};
//# sourceMappingURL=submission.repo.js.map