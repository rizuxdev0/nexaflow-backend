// export interface PaginatedResponse<T> {
//   data: T[];
//   total: number;
//   page: number;
//   pageSize: number;
//   totalPages: number;
// }
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  // hasNext: boolean;
  // hasPrevious: boolean;
}

export class PaginatedResponseBuilder {
  static build<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      // hasNext: page < totalPages,
      // hasPrevious: page > 1,
    };
  }
}
