import { HttpResponse } from 'msw';

/** The common error body of api-contract §2, with the X-Correlation-Id of the request. */
export function errorBody(
  request: Request,
  status: number,
  error: string,
  message: string,
  details: { field: string; message: string }[] = [],
) {
  const traceId = request.headers.get('X-Correlation-Id') ?? crypto.randomUUID();
  return HttpResponse.json({ error, message, details, traceId }, { status });
}
