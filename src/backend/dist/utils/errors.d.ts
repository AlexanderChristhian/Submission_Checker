export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map