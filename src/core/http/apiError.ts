/**
 * Every failure reaches the portal with the shape of the common error body (api-contract §2) plus
 * the message for the person, decided here and only here (Annex H).
 */
export interface ErrorDetail {
  field: string;
  message: string;
}

/** Codes of api-contract §2.1, plus the two the client produces itself (status 0). */
const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'La solicitud tiene datos inválidos.',
  UNAUTHORIZED: 'Debe iniciar sesión para continuar.',
  FORBIDDEN: 'No tiene permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no existe.',
  METHOD_NOT_ALLOWED: 'Método no permitido.',
  TOO_MANY_REQUESTS: 'Demasiadas solicitudes. Intente de nuevo más tarde.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado.',
  SERVICE_UNAVAILABLE: 'El servicio no está disponible en este momento.',
  TIMEOUT: 'El servidor tardó demasiado en responder. Intente de nuevo.',
  NETWORK_ERROR: 'No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.',
};

const CODE_BY_STATUS: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  429: 'TOO_MANY_REQUESTS',
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly error: string,
    message: string,
    readonly details: ErrorDetail[],
    readonly traceId: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** From the body of a failed response: the contract envelope, or a message decided by status. */
  static fromResponse(status: number, body: unknown, traceId: string): ApiError {
    if (isErrorBody(body)) {
      return new ApiError(status, body.error, body.message, body.details, body.traceId);
    }
    const code =
      CODE_BY_STATUS[status] ?? (status >= 502 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR');
    return ApiError.of(status, code, traceId);
  }

  /** An error the client produces itself (TIMEOUT, NETWORK_ERROR) or one decided by its code. */
  static of(status: number, code: string, traceId: string): ApiError {
    return new ApiError(status, code, MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR!, [], traceId);
  }
}

function isErrorBody(
  body: unknown,
): body is { error: string; message: string; details: ErrorDetail[]; traceId: string } {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.error === 'string' &&
    typeof candidate.message === 'string' &&
    Array.isArray(candidate.details) &&
    typeof candidate.traceId === 'string'
  );
}
