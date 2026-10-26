// Mock PROVISIONAL de lo que lentes-api aún no publica (openapi/provisional/web-ops.yaml):
// checkout, pedidos, recompra y recetas. Catálogo, carrito y direcciones salen de la API real.
// Solo desarrollo: `pnpm mock` en :8081 (NEXT_PUBLIC_PROVISIONAL_API_URL=http://localhost:8081/v1).
import { createServer } from "node:http";

const orders = new Map(); // id -> { ...order, created }
const prescriptions = [];
let orderNumber = 100;

const sampleItems = [
  { product_name: "Biofinity", brand_name: "CooperVision", eye: "right", quantity: 1, unit_price_cents: 38000, sphere: -2, cylinder: null, axis: null, addition: null, base_curve: 8.6, diameter: 14, color: null },
  { product_name: "Biofinity", brand_name: "CooperVision", eye: "left", quantity: 1, unit_price_cents: 38000, sphere: -2.25, cylinder: null, axis: null, addition: null, base_curve: 8.6, diameter: 14, color: null },
];

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
  const problem = (status, title, detail) => send(status, { title, status, detail }, "application/problem+json");
  const p = new URL(req.url, "http://x").pathname.replace(/^\/v1/, "");

  if (p === "/checkout" && req.method === "POST") {
    const b = await readBody(req);
    if (!b.address_id) return problem(400, "Falta la dirección");
    const id = crypto.randomUUID();
    orders.set(id, {
      id, number: ++orderNumber, status: "pending_payment",
      total_cents: sampleItems.reduce((n, i) => n + i.unit_price_cents * i.quantity, 0),
      items: sampleItems, created: Date.now(),
    });
    return send(200, {
      order_id: id,
      // El "pago" se aprueba solo 4 s después de crear el pedido.
      init_point: `http://localhost:3000/checkout/resultado?external_reference=${id}&collection_status=approved`,
    });
  }

  let m = p.match(/^\/me\/orders\/([^/]+)(\/reorder)?$/);
  if (m) {
    const o = orders.get(m[1]);
    if (!o) return problem(404, "No encontrado");
    if (m[2] && req.method === "POST") return send(200, { added: o.items.length, unavailable: [] });
    if (o.status === "pending_payment" && Date.now() - o.created > 4000) o.status = "paid";
    return send(200, { id: o.id, number: o.number, status: o.status, total_cents: o.total_cents, items: o.items });
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
  return problem(404, "No encontrado");
}).listen(8081, () => console.log("mock provisional http://localhost:8081/v1"));
