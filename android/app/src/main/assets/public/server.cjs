var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_supabase_js = require("@supabase/supabase-js");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var supabaseServerClient = null;
function getSupabaseServer() {
  if (supabaseServerClient) return supabaseServerClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://caibxfxxhimfdmwfpkli.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhaWJ4Znh4aGltZmRtd2Zwa2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5ODAzNzEsImV4cCI6MjEwMjU1NjM3MX0.TMFKbVDWSsR_zsrXSU-8WOHDKHVptnguXp3vTg-YLdk";
  if (url && key) {
    try {
      supabaseServerClient = (0, import_supabase_js.createClient)(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } catch (e) {
      console.warn("Failed to init Supabase server client:", e);
    }
  }
  return supabaseServerClient;
}
var serverStateSnapshot = null;
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    const sb = getSupabaseServer();
    res.json({
      status: "ok",
      engine: "Meridian Android 14+ Personal Operating System Core",
      supabaseConnected: !!sb,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/supabase/status", (req, res) => {
    const sb = getSupabaseServer();
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
    res.json({
      configured: !!sb,
      url: url ? url.replace(/\/\/([^@]+@)?/, "//***@") : null,
      lastSync: serverStateSnapshot?.timestamp || null
    });
  });
  app.post("/api/supabase/sync", async (req, res) => {
    try {
      const { data, timestamp } = req.body;
      const syncTime = timestamp || (/* @__PURE__ */ new Date()).toISOString();
      serverStateSnapshot = { data, timestamp: syncTime };
      const sb = getSupabaseServer();
      if (sb) {
        const { error } = await sb.from("meridian_backups").upsert(
          {
            id: "current_user_state",
            payload: data,
            updated_at: syncTime
          },
          { onConflict: "id" }
        );
        if (error) {
          console.warn("Supabase DB table upsert notice:", error.message);
          return res.json({
            success: true,
            syncedWithDatabase: false,
            message: `Snapshot stored on server. DB table sync pending: ${error.message}`,
            timestamp: syncTime
          });
        }
        return res.json({
          success: true,
          syncedWithDatabase: true,
          message: "Successfully synchronized state with Supabase cloud database.",
          timestamp: syncTime
        });
      }
      res.json({
        success: true,
        syncedWithDatabase: false,
        message: "Synchronized with local server storage. Supabase cloud URL not yet configured.",
        timestamp: syncTime
      });
    } catch (error) {
      console.error("Error in /api/supabase/sync:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Sync failure"
      });
    }
  });
  app.get("/api/supabase/pull", async (req, res) => {
    try {
      const sb = getSupabaseServer();
      if (sb) {
        const { data, error } = await sb.from("meridian_backups").select("payload, updated_at").eq("id", "current_user_state").single();
        if (!error && data?.payload) {
          return res.json({
            success: true,
            data: data.payload,
            timestamp: data.updated_at,
            source: "supabase_database"
          });
        }
      }
      if (serverStateSnapshot) {
        return res.json({
          success: true,
          data: serverStateSnapshot.data,
          timestamp: serverStateSnapshot.timestamp,
          source: "server_memory"
        });
      }
      res.status(404).json({
        success: false,
        message: "No previous cloud snapshot found."
      });
    } catch (error) {
      console.error("Error in /api/supabase/pull:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Fetch failure"
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Meridian Android 14+ OS running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
