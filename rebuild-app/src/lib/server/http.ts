export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, { status: 200, ...(init || {}) });
}

export function created<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, { status: 201, ...(init || {}) });
}

export function badRequest(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

