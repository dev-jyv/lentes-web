import { Hr, Section, Text } from "@react-email/components";
import { Button, colors, h1, optic, p, small, Layout } from "./components/layout";
import { raw, v } from "./components/tpl";

// Confirmación de pedido (se envía al confirmarse el pago).
export default function OrderPaid() {
  return (
    <Layout preview={`Recibimos tu pago. Pedido ${v("OrderNumber")}`}>
      <Text style={h1}>¡Gracias por tu compra, {v("CustomerName")}!</Text>
      <Text style={p}>
        Recibimos tu pago y ya estamos preparando tu pedido <strong style={optic as never}>{v("OrderNumber")}</strong>.
      </Text>

      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "8px 0 4px" }}>
        <tbody>
          {raw("range .Items")}
          <tr>
            <td style={{ padding: "10px 0", borderTop: `1px solid ${colors.line}`, verticalAlign: "top" }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{v("Name")}</div>
              <div style={optic as never}>{v("EyeLabel")} · {v("Detail")}</div>
              <div style={small}>{v("Quantity")} × {v("UnitPrice")}</div>
            </td>
            <td align="right" style={{ padding: "10px 0", borderTop: `1px solid ${colors.line}`, verticalAlign: "top", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>
              {v("LineTotal")}
            </td>
          </tr>
          {raw("end")}
        </tbody>
      </table>

      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 18px" }}>
        <tbody>
          <tr><td style={{ ...small, padding: "2px 0", borderTop: `1px solid ${colors.line}` }}>Subtotal</td><td align="right" style={{ ...small, padding: "2px 0", borderTop: `1px solid ${colors.line}` }}>{v("Subtotal")}</td></tr>
          <tr><td style={{ ...small, padding: "2px 0" }}>Envío</td><td align="right" style={{ ...small, padding: "2px 0" }}>{v("Shipping")}</td></tr>
          <tr><td style={{ ...p, margin: 0, padding: "6px 0", fontWeight: 700 }}>Total</td><td align="right" style={{ ...p, margin: 0, padding: "6px 0", fontWeight: 700 }}>{v("Total")}</td></tr>
        </tbody>
      </table>

      <Section style={{ backgroundColor: colors.bg, borderRadius: 10, padding: "12px 14px", margin: "0 0 18px" }}>
        <Text style={{ ...small, margin: 0, fontWeight: 700, color: colors.ink }}>Envío a</Text>
        <Text style={{ ...small, margin: 0 }}>{v("RecipientName")}</Text>
        <Text style={{ ...small, margin: 0 }}>{v("Address")}</Text>
      </Section>

      <Button href={v("OrderURL")}>Ver mi pedido</Button>
      <Hr style={{ borderColor: colors.line, margin: "20px 0 12px" }} />
      <Text style={small}>Te escribiremos de nuevo cuando tu pedido salga con su número de guía.</Text>
    </Layout>
  );
}
