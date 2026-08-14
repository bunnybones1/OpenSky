export class RpcError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

export const invalidArgument = (message: string) =>
  new RpcError(400, 'webrpc.invalid_argument', message)

export const permissionDenied = (message: string) =>
  new RpcError(403, 'webrpc.permission_denied', message)

export const alreadyExists = (message: string) =>
  new RpcError(409, 'webrpc.already_exists', message)

export const notFound = (message: string) =>
  new RpcError(404, 'webrpc.not_found', message)

export const failedPrecondition = (message: string) =>
  new RpcError(412, 'webrpc.failed_precondition', message)

export const unauthenticated = (message = 'unauthorized') =>
  new RpcError(401, 'webrpc.unauthenticated', message)

export const internal = (message = 'internal server error') =>
  new RpcError(500, 'webrpc.internal', message)

export const unimplemented = (message = 'unimplemented') =>
  new RpcError(501, 'webrpc.unimplemented', message)

export const unavailable = (message = 'service unavailable') =>
  new RpcError(503, 'webrpc.unavailable', message)
