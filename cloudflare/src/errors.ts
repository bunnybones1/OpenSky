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

export const unauthenticated = (message = 'unauthorized') =>
  new RpcError(401, 'webrpc.unauthenticated', message)
