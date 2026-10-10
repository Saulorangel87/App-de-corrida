import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { rateLimiter } from "hono-rate-limiter";
import auth from "./routes/auth";

const app = new Hono();

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use("*", cors({
    origin: allowedOrigin,
    credentials: true,
}));

app.use("*", csrf({
    origin: allowedOrigin,
}));


app.use(
  "*",
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, 
    standardHeaders: "draft-6",
    keyGenerator: (c) => {
      return c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "global";
    },
  })
);

app.route("/auth", auth);

app.get("/", (c) => c.text("Passo API"));

import { serve } from "@hono/node-server";

const port = parseInt(process.env.PORT || "3000", 10);
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});

export default app;
