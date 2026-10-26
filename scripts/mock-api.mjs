// Mock local del contrato openapi/openapi.yaml. Solo desarrollo: `pnpm mock`.
import { createServer } from "node:http";

const brands = [
  { id: "b1000000-0000-4000-8000-000000000001", name: "Acuvue", slug: "acuvue" },
  { id: "b1000000-0000-4000-8000-000000000002", name: "Air Optix", slug: "air-optix" },
  { id: "b1000000-0000-4000-8000-000000000003", name: "Biofinity", slug: "biofinity" },
];

const range = (a, b, step) => {
  const out = [];
  for (let v = a; v <= b + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
};

const defs = [
  ["acuvue-oasys", "Acuvue Oasys", 0, "spherical", "biweekly", 6, 52900],
  ["acuvue-moist-1-day", "1-Day Acuvue Moist", 0, "spherical", "daily", 30, 43900],
  ["acuvue-oasys-astigmatismo", "Acuvue Oasys for Astigmatism", 0, "toric", "biweekly", 6, 69900],
  ["air-optix-aqua", "Air Optix Aqua", 1, "spherical", "monthly", 6, 48900],
  ["air-optix-multifocal", "Air Optix Multifocal", 1, "multifocal", "monthly", 6, 89900],
  ["biofinity", "Biofinity", 2, "spherical", "monthly", 6, 45900],
  ["biofinity-toric", "Biofinity Toric", 2, "toric", "monthly", 6, 79900],
];

const products = defs.map(([slug, name, b, lens_type, replacement, pieces, price], i) => ({
  id: `a1000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  slug, name, brand: brands[b], lens_type, replacement,
  pieces_per_box: pieces, from_price_cents: price, image_key: null,
  description: `${name}: lente de contacto ${replacement === "daily" ? "diario" : replacement === "monthly" ? "mensual" : "quincenal"} de alta calidad.`,
  material: "Silicona hidrogel", water_content_pct: 38.0,
  requires_prescription: true, images: [],
  options: {
    spheres: range(-12, 8, 0.25).filter((v) => v !== 0 && (v > -6 || v % 0.5 === 0)),
    cylinders: lens_type === "toric" ? [-0.75, -1.25, -1.75, -2.25] : [],
    axes: lens_type === "toric" ? range(0, 180, 10).map(Math.round) : [],
    additions: lens_type === "multifocal" ? ["LOW", "MID", "HIGH"] : [],
    base_curves: [8.4, 8.6], diameters: [14.0],
    colors: [],
  },
}));

const problem = (res, status, title) => {
  res.writeHead(status, { "content-type": "application/problem+json" });
  res.end(JSON.stringify({ title, status }));
};

const carts = new Map(); // token -> items[]
const addresses = [];
const orders = new Map(); // id -> { id, number, status, total_cents, created }
let orderNumber = 100;

const readBody = (req) =>
  new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b ? JSON.parse(b) : {}));
  });

const cartView = (items) => ({
  items,
  subtotal_cents: items.reduce((n, i) => n + i.line_total_cents, 0),
});

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "authorization,content-type,x-cart-token");
  res.setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("access-control-expose-headers", "x-cart-token");
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  const json = (body) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const p = url.pathname.replace(/^\/v1/, "");
  const q = url.searchParams;

  if (p === "/healthz") return json({ ok: true });

  // --- carrito (en memoria) ---
  if (p.startsWith("/cart")) {
    let token = req.headers["x-cart-token"];
    if (!token || !carts.has(token)) {
      token = crypto.randomUUID();
      carts.set(token, []);
    }
    res.setHeader("x-cart-token", token);
    const items = carts.get(token);
    if (req.method === "GET" && p === "/cart") return json(cartView(items));
    if (req.method === "POST" && p === "/cart/merge") return json(cartView(items));
    if (req.method === "POST" && p === "/cart/items") {
      const b = await readBody(req);
      const [slug, sphere, cylinder, axis, addition, base_curve, diameter] = JSON.parse(
        Buffer.from(b.variant_id, "base64url").toString(),
      );
      const product = products.find((x) => x.slug === slug);
      const existing = items.find((i) => i.variant_id === b.variant_id && i.eye === b.eye);
      if (existing) existing.quantity += b.quantity;
      else
        items.push({
          id: crypto.randomUUID(), variant_id: b.variant_id, eye: b.eye, quantity: b.quantity,
          unit_price_cents: product.from_price_cents, line_total_cents: 0,
          product_name: product.name, product_slug: slug, brand_name: product.brand.name,
          params: { sphere, cylinder, axis, addition, base_curve, diameter }, available: 25,
        });
      items.forEach((i) => (i.line_total_cents = i.unit_price_cents * i.quantity * (i.eye === "both" ? 2 : 1)));
      return json(cartView(items));
    }
    const m = p.match(/^\/cart\/items\/([^/]+)$/);
    if (m) {
      const idx = items.findIndex((i) => i.id === m[1]);
      if (idx < 0) return problem(res, 404, "No encontrado");
      if (req.method === "DELETE") items.splice(idx, 1);
      if (req.method === "PATCH") items[idx].quantity = (await readBody(req)).quantity;
      items.forEach((i) => (i.line_total_cents = i.unit_price_cents * i.quantity * (i.eye === "both" ? 2 : 1)));
      return json(cartView(items));
    }
  }

  // --- direcciones ---
  if (p === "/me/addresses") {
    if (req.method === "POST") {
      const a = { id: crypto.randomUUID(), ...(await readBody(req)) };
      addresses.push(a);
      res.writeHead(201, { "content-type": "application/json" });
      return res.end(JSON.stringify(a));
    }
    return json({ items: addresses });
  }

  // --- checkout: el "pago" se aprueba solo 4 s después ---
  if (p === "/checkout" && req.method === "POST") {
    const token = req.headers["x-cart-token"];
    const items = carts.get(token) ?? [];
    if (items.length === 0) return problem(res, 409, "Carrito vacío");
    const id = crypto.randomUUID();
    orders.set(id, {
      id, number: ++orderNumber, status: "pending_payment",
      total_cents: cartView(items).subtotal_cents, created: Date.now(),
    });
    carts.set(token, []);
    return json({
      order_id: id,
      init_point: `http://localhost:3000/checkout/resultado?external_reference=${id}&collection_status=approved`,
    });
  }
  const om = p.match(/^\/me\/orders\/([^/]+)$/);
  if (om) {
    const o = orders.get(om[1]);
    if (!o) return problem(res, 404, "No encontrado");
    if (o.status === "pending_payment" && Date.now() - o.created > 4000) o.status = "paid";
    return json({ id: o.id, number: o.number, status: o.status, total_cents: o.total_cents });
  }
  if (p === "/brands") return json({ items: brands });
  if (p === "/products") {
    const items = products.filter(
      (x) =>
        (!q.get("brand") || x.brand.slug === q.get("brand")) &&
        (!q.get("lens_type") || x.lens_type === q.get("lens_type")) &&
        (!q.get("replacement") || x.replacement === q.get("replacement")),
    );
    return json({ items, next_cursor: null });
  }
  const m = p.match(/^\/products\/([^/]+)(\/variant)?$/);
  const product = m && products.find((x) => x.slug === m[1]);
  if (!product) return problem(res, 404, "No encontrado");
  if (!m[2]) return json(product);

  const sphere = Number(q.get("sphere"));
  if (!product.options.spheres.includes(sphere)) return problem(res, 404, "Sin variante");
  const num = (k) => (q.get(k) === null ? null : Number(q.get(k)));
  const vid = Buffer.from(
    JSON.stringify([product.slug, sphere, num("cylinder"), num("axis"), q.get("addition"), num("base_curve"), num("diameter")]),
  ).toString("base64url");
  return json({
    id: vid,
    sku: `${product.slug}-${sphere}`.toUpperCase(),
    price_cents: product.from_price_cents,
    compare_at_cents: null,
    available: sphere === -3 ? 0 : 25,
  });
}).listen(8080, () => console.log("mock api http://localhost:8080/v1"));
