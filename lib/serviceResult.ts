export type ServiceResult = {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
};

export function serviceJson(status: number, body: Record<string, unknown>, headers?: Record<string, string>): ServiceResult {
  return { status, body, headers };
}

export function applyServiceResult(
  res: { status: (code: number) => { json: (body: unknown) => unknown }; setHeader?: (key: string, value: string) => void },
  result: ServiceResult,
) {
  if (result.headers && res.setHeader) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value);
    }
  }
  return res.status(result.status).json(result.body);
}
