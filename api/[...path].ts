export default async function handler(req: any, res: any) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  res.end(
    JSON.stringify({
      success: false,
      message: 'API route not found',
      error: `The requested endpoint '${req.url}' does not exist on this server.`,
    })
  );
}
