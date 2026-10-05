import { Server } from "npm:socket.io";
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-1766fb4e/health", (c) => {
  return c.json({ status: "ok" });
});

// Create Socket.IO server
const io = new Server({
  cors: { origin: "*" },
  path: "/functions/v1/make-server-1766fb4e/socket.io/",
  transports: ["websocket", "polling"],
});

// Use Deno's built-in BroadcastChannel to sync across isolates
const bc = new BroadcastChannel("partly-global-sync");

bc.onmessage = async (event) => {
  const { type, roomId, data, sid } = event.data;
  
  if (type === "player-joined") {
    io.to(roomId).emit("player-joined", data);
  } else if (type === "update") {
    io.to(roomId).emit("update", data);
  } else if (type === "chat") {
    io.to(roomId).emit("chat", data);
  } else if (type === "player-left") {
    io.to(roomId).emit("player-left", data);
  } else if (type === "request-state") {
    // Another isolate wants room state. Broadcast all our local players.
    const sockets = await io.in(roomId).fetchSockets();
    for (const s of sockets) {
      if (s.data.player) {
        // Send our local player data back through the channel so the requesting isolate gets it
        bc.postMessage({ type: "update-silent", roomId, data: s.data.player, sid: s.id });
      }
    }
  } else if (type === "update-silent") {
    // An isolate sent us their local player state in response to request-state.
    // Forward this to our local clients.
    io.to(roomId).emit("update", data);
  } else if (type === "request-counts") {
    // Another isolate asked for counts
    bc.postMessage({ type: "report-counts", counts: getLocalRoomCounts() });
  } else if (type === "report-counts") {
    // Received counts from another isolate. We could aggregate this, 
    // but for simplicity we'll just broadcast what we have.
    // In a real app we'd aggregate.
  }
};

function getLocalRoomCounts() {
  const counts: Record<string, number> = {};
  for (const [roomId, room] of io.sockets.adapter.rooms.entries()) {
    if (!io.sockets.adapter.sids.has(roomId)) {
       counts[roomId] = room.size;
    }
  }
  return counts;
}

app.get("/make-server-1766fb4e/rooms-info", (c) => {
  // Return local room counts for now.
  // With BroadcastChannel we could aggregate, but this is fine for now.
  return c.json({ rooms: getLocalRoomCounts() });
});

io.on("connection", (socket) => {
  console.log("Client connected via Socket.IO:", socket.id);
  
  socket.on("join-room", async (data) => {
    socket.join(data.roomId);
    socket.data.roomId = data.roomId;
    if (data.player) {
      socket.data.player = data.player;
      // Broadcast to local room
      socket.to(data.roomId).emit("player-joined", data.player);
      // Broadcast to other isolates
      bc.postMessage({ type: "player-joined", roomId: data.roomId, data: data.player, sid: socket.id });
    }
    console.log(`Socket ${socket.id} joined room ${data.roomId}`);
    
    // Send existing local players to the new client
    const sockets = await io.in(data.roomId).fetchSockets();
    const existingPlayers = sockets
      .map(s => s.data.player)
      .filter(p => p && p.id !== socket.data.player?.id);
      
    socket.emit("room-state", existingPlayers);

    // Request players from other isolates
    bc.postMessage({ type: "request-state", roomId: data.roomId, sid: socket.id });

    io.emit("room-counts", getLocalRoomCounts());
  });

  socket.on("update", (data) => {
    if (!socket.data.roomId) socket.data.roomId = data.roomId;
    if (!socket.data.player) socket.data.player = data.payload;
    socket.data.player = { ...socket.data.player, ...data.payload };
    
    // Broadcast locally
    socket.to(data.roomId).emit("update", data.payload);
    // Broadcast to other isolates
    bc.postMessage({ type: "update", roomId: data.roomId, data: data.payload, sid: socket.id });
  });

  socket.on("chat", (data) => {
    socket.to(data.roomId).emit("chat", data.payload);
    bc.postMessage({ type: "chat", roomId: data.roomId, data: data.payload, sid: socket.id });
  });

  socket.on("ping", (cb) => {
    if (typeof cb === "function") cb();
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    if (socket.data.player?.id && socket.data.roomId) {
      io.to(socket.data.roomId).emit("player-left", socket.data.player.id);
      bc.postMessage({ type: "player-left", roomId: socket.data.roomId, data: socket.data.player.id, sid: socket.id });
    }
    io.emit("room-counts", getLocalRoomCounts());
  });
});

Deno.serve(async (req, info) => {
  const url = new URL(req.url);
  if (url.pathname.includes("/make-server-1766fb4e/socket.io/")) {
    try {
      return await io.engine.handleRequest(req);
    } catch (e) {
      console.error("Socket.IO Engine error:", e);
      return new Response("Socket.IO Engine error", { status: 500 });
    }
  }
  return app.fetch(req, info);
});
