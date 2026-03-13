import { plagiarismService } from "../services/plagiarism.service.js";
export const plagiarismController = {
    async checkSimilarity(req, res, next) {
        try {
            const id = Number(req.params["id"]);
            const matches = await plagiarismService.checkSimilarity(id);
            res.json({ data: matches });
        }
        catch (err) {
            next(err);
        }
    },
    async getSimilar(req, res, next) {
        try {
            const id = Number(req.params["id"]);
            const minScore = req.query["minScore"]
                ? Number(req.query["minScore"])
                : 0.7;
            const similar = await plagiarismService.getSimilarSubmissions(id, minScore);
            res.json({ data: similar });
        }
        catch (err) {
            next(err);
        }
    },
    async getClusters(req, res, next) {
        try {
            const minScore = req.query["minScore"]
                ? Number(req.query["minScore"])
                : 0.8;
            const clusters = await plagiarismService.getClusters(minScore);
            res.json({ data: clusters });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=plagiarism.controller.js.map