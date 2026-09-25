// Vercel Cron sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
export function cronHandler(job: () => Promise<unknown>) {
  return async (req: Request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      return Response.json(await job());
    } catch (err) {
      console.error(err);
      return Response.json({ error: String(err) }, { status: 500 });
    }
  };
}
