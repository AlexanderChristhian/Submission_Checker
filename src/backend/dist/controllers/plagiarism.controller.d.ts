import type { Request, Response, NextFunction } from "express";
export declare const plagiarismController: {
    checkSimilarity(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSimilar(req: Request, res: Response, next: NextFunction): Promise<void>;
    getClusters(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=plagiarism.controller.d.ts.map