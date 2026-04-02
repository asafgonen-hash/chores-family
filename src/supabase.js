// src/supabase.js — Supabase REST + Realtime websocket (instant sync)

const SUPABASE_URL = "https://aigdxmvnynpdfvmfbfvf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ2R4bXZueW5wZGZ2bWZiZnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDc5NjcsImV4cCI6MjA4ODgyMzk2N30.f1xpYwkP1j1S7uuYcTdGGwhIDm4xvSVCv84H-37Qqww";

const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

const ROW_ID = 1;

// Load once on startup
export async function loadData() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/family_data?id=eq.${ROW_ID}&select=data`,
    { headers: HEADERS }
  );
  if (!res.ok) throw new Error(`Load failed: ${res.status}`);
  const rows = await res.json();
  if (rows.length === 0) return null;
  return rows[0].data;
}

// Save (upsert) entire state
export async function saveData(data) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/family_data`,
    {
      method: "POST",
      headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: ROW_ID, data }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Save failed: ${res.status} ${txt}`);
  }
}

// Realtime websocket — fires callback(newData) instantly on any device save.
// Uses Supabase's native Phoenix websocket protocol. Auto-reconnects on drop.
export function subscribeToRealtime(callback) {
  let ws = null;
  let heartbeatTimer = null;
  let ref = 1;
  let stopped = false;

  function connect() {
    if (stopped) return;
    const wsUrl =
      SUPABASE_URL.replace("https://", "wss://") +
      `/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;

    ws = new WebSocket(wsUrl);

    const send = (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    ws.onopen = () => {
      send({
        topic: "realtime:family_changes",
        event: "phx_join",
        payload: {
          config: {
            broadcast: { self: false },
            postgres_changes: [
              { event: "UPDATE", schema: "public", table: "family_data", filter: `id=eq.${ROW_ID}` },
            ],
          },
        },
        ref: String(ref++),
      });
      heartbeatTimer = setInterval(() => {
        send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(ref++) });
      }, 25000);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === "postgres_changes" && msg.payload?.data?.record?.data) {
          callback(msg.payload.data.record.data);
        }
      } catch (e) {
        console.warn("Realtime parse error:", e);
      }
    };

    ws.onerror = (e) => console.warn("Realtime WS error:", e);
    ws.onclose = () => {
      clearInterval(heartbeatTimer);
      if (!stopped) setTimeout(connect, 3000);
    };
  }

  connect();
  return () => { stopped = true; clearInterval(heartbeatTimer); if (ws) ws.close(); };
}

// ── Storage: upload proof photo ───────────────────────────────────────────────
// Compresses image to ~80KB before uploading to Supabase Storage bucket
export async function uploadProofPhoto(file, uid, choreId) {
  // 1. Compress via canvas
  const compressed = await compressImage(file, 800, 0.7);

  // 2. Build a unique path: uid/choreId/timestamp.jpg
  const path = `${uid}/${choreId}/${Date.now()}.jpg`;

  // 3. Upload to Supabase Storage bucket "proof-photos"
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/proof-photos/${path}`,
    {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
      },
      body: compressed,
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${res.status} ${txt}`);
  }

  // 4. Return the public URL
  return `${SUPABASE_URL}/storage/v1/object/public/proof-photos/${path}`;
}

// Compress image using canvas — returns a Blob
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")), "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}
