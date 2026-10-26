import { Hr, Section, Text } from "@react-email/components";
import { Button, colors, h1, optic, p, small, Layout } from "./components/layout";
import { raw, v } from "./components/tpl";

// Pedido enviado (con guía).
export default function OrderShipped() {
  return (
    <Layout preview={`Tu pedido ${v("OrderNumber")} va en camino`}>
      <Text style={h1}>Tu pedido va en camino</Text>
      <Text style={p}>
        {v("CustomerName")}, tu pedido <strong style={optic as never}>{v("OrderNumber")}</strong> ya salió.
      </Text>

      <Section style={{ backgroundColor: colors.tealSoft, borderRadius: 10, padding: "14px 16px", margin: "0 0 18px" }}>
        <Text style={{ ...small, margin: 0, color: colors.ink }}>Paquetería</Text>
        <Text style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>{v("Carrier")}</Text>
        <Text style={{ ...small, margin: 0, color: colors.ink }}>Número de guía</Text>
        <Text style={{ margin: 0, fontSize: 16, fontWeight: 700, ...(optic as object) } as never}>{v("TrackingNumber")}</Text>
      </Section>

      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 14px" }}>
        <tbody>
          {raw("range .Items")}
          <tr>
            <td style={{ padding: "8px 0", borderTop: `1px solid ${colors.line}` }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{v("Name")} <span style={small}>× {v("Quantity")}</span></div>
              <div style={optic as never}>{v("EyeLabel")} · {v("Detail")}</div>
            </td>
          </tr>
          {raw("end")}
        </tbody>
      </table>

      <Section style={{ backgroundColor: colors.bg, borderRadius: 10, padding: "12px 14px", margin: "0 0 18px" }}>
        <Text style={{ ...small, margin: 0, fontWeight: 700, color: colors.ink }}>Se entrega a</Text>
        <Text style={{ ...small, margin: 0 }}>{v("RecipientName")}</Text>
        <Text style={{ ...small, margin: 0 }}>{v("Address")}</Text>
      </Section>

      <Button href={v("OrderURL")}>Ver mi pedido</Button>
      <Hr style={{ borderColor: colors.line, margin: "20px 0 12px" }} />
      <Text style={small}>Si no estás para recibirlo, la paquetería puede intentar la entrega más de una vez.</Text>
    </Layout>
  );
}
