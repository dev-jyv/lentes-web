// Mock PROVISIONAL de lo que lentes-api aún no publica (openapi/provisional/web-ops.yaml): recompra y recetas.
// Catálogo, carrito, direcciones, checkout y pedidos salen de la API real.
// Solo desarrollo: `pnpm mock` en :8081 (NEXT_PUBLIC_PROVISIONAL_API_URL=http://localhost:8081/v1).
import { createServer } from "node:http";

const prescriptions = [];

const readBody = (req) =>
  new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b ? JSON.parse(b) : {}));
  });

createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "authorization,content-type,x-cart-token");
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,OPTIONS");
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  const send = (status, body, type = "application/json") => {
    res.writeHead(status, { "content-type": type });
    res.end(JSON.stringify(body));
  };
  const p = new URL(req.url, "http://x").pathname.replace(/^\/v1/, "");

  // Recompra: no agrega nada al carrito real; solo permite recorrer la pantalla.
  if (/^\/me\/orders\/[^/]+\/reorder$/.test(p) && req.method === "POST") {
    return send(200, { added: 2, unavailable: [] });
  }
  if (p === "/me/prescriptions/upload-url" && req.method === "POST") {
    const key = `recetas/${crypto.randomUUID()}`;
    return send(200, { upload_url: `http://localhost:8081/uploads/${key}`, r2_key: key });
  }
  if (p.startsWith("/uploads/") && req.method === "PUT") {
    req.resume();
    return req.on("end", () => res.writeHead(200).end());
  }
  if (p === "/me/prescriptions") {
    if (req.method === "POST") {
      const r = { id: crypto.randomUUID(), status: "pending", created_at: new Date().toISOString(), reject_reason: null, ...(await readBody(req)) };
      prescriptions.push(r);
      return send(201, r);
    }
    return send(200, { items: prescriptions });
  }
  return send(404, { title: "No encontrado", status: 404 }, "application/problem+json");
}).listen(8081, () => console.log("mock provisional http://localhost:8081/v1"));
