export default async function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    service: 'awardx-api',
    timestamp: new Date().toISOString(),
  });
}
