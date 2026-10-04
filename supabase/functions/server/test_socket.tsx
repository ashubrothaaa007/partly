import { Server } from "npm:socket.io";
import { Hono } from "npm:hono";

const app = new Hono();
const io = new Server({
  cors: { origin: "*" }
});

const fetchHandler = (req: Request, info: any) => {
  if (req.url.includes("/socket.io/")) {
    return io.handler()(req, info);
  }
  return app.fetch(req, info);
};
