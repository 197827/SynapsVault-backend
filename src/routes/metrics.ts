import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { metricsRegistry } from "../lib/metrics.js";

const metricsRouter: IRouter = Router();

metricsRouter.get("/metrics", async (req: Request, res: Response) => {
  if (!config.METRICS_TOKEN) {
    res.status(404).end();
    return;
  }

  const provided = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const digest = (token: string) => createHash("sha256").update(token).digest();

  if (
    !provided ||
    !timingSafeEqual(digest(provided), digest(config.METRICS_TOKEN))
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const output = await metricsRegistry.metrics();
  res.set("Content-Type", metricsRegistry.contentType).send(output);
});

export default metricsRouter;
