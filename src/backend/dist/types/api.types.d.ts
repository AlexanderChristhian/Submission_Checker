export interface ApiResponse<T> {
    data: T;
    message?: string;
}
export interface ApiErrorResponse {
    error: string;
    statusCode: number;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}
//# sourceMappingURL=api.types.d.ts.map