// Mock PROVISIONAL de lo que lentes-api aún no publica (openapi/provisional/web-ops.yaml): solo la recompra.
// Catálogo, carrito, direcciones, checkout, pedidos y recetas salen de la API real.
// Solo desarrollo: `pnpm mock` en :8081 (NEXT_PUBLIC_PROVISIONAL_API_URL=http://localhost:8081/v1).
import { createServer } from "node:http";

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
  return send(404, { title: "No encontrado", status: 404 }, "application/problem+json");
}).listen(8081, () => console.log("mock provisional http://localhost:8081/v1"));
