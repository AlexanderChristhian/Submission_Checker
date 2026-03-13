import { ValidationError } from "../utils/errors.js";
export function validate(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const message = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ");
            next(new ValidationError(message));
            return;
        }
        req.body = result.data;
        next();
    };
}
//# sourceMappingURL=validation.middleware.js.map