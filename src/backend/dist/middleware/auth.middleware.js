import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../config/auth.js";
import { AppError } from "../utils/errors.js";
export async function authMiddleware(req, _res, next) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });
        if (!session) {
            next(new AppError("Authentication required", 401));
            return;
        }
        req.user = session.user;
        next();
    }
    catch {
        next(new AppError("Invalid or expired session", 401));
    }
}
//# sourceMappingURL=auth.middleware.js.map