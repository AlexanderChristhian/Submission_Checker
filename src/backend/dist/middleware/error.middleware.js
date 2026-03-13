import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
export function errorHandler(err, req, res, _next) {
    if (err instanceof AppError) {
        logger.warn({ statusCode: err.statusCode, path: req.path }, err.message);
        res.status(err.statusCode).json({
            error: err.message,
            statusCode: err.statusCode,
        });
        return;
    }
    logger.error({ error: err.message, path: req.path, stack: err.stack }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
}
//# sourceMappingURL=error.middleware.js.map