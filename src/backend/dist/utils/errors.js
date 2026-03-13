export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = "AppError";
    }
}
export class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404);
    }
}
export class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}
//# sourceMappingURL=errors.js.map