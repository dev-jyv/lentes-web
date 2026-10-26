import { Section, Text } from "@react-email/components";
import { Button, colors, h1, optic, p, small, Layout } from "./components/layout";
import { raw, v } from "./components/tpl";

// Recordatorio de recompra: "se te acaban tus lentes". Lo envía el worker unos días antes de la fecha estimada.
export default function ReorderReminder() {
  return (
    <Layout
      preview="Es buen momento de reponer tus lentes"
      footer={
        <>
          Te escribimos porque aceptaste recibir avisos. Puedes dejar de recibirlos desde{" "}
          <a href={v("ManageURL")} style={{ color: colors.muted }}>tu cuenta</a>.
        </>
      }
    >
      <Text style={h1}>Se te están acabando tus lentes</Text>
      <Text style={p}>
        {v("CustomerName")}, según tu último pedido (<span style={optic as never}>{v("OrderNumber")}</span>), tus lentes
        te alcanzan hasta alrededor del <strong>{v("RunOutDate")}</strong>.
      </Text>

      <Section style={{ backgroundColor: colors.bg, borderRadius: 10, padding: "12px 14px", margin: "0 0 18px" }}>
        <Text style={{ ...small, margin: "0 0 4px", fontWeight: 700, color: colors.ink }}>Lo que pediste</Text>
        {raw("range .Items")}
        <Text style={{ ...small, margin: 0 }}>{v("Name")} · {v("EyeLabel")} · <span style={optic as never}>{v("Detail")}</span></Text>
        {raw("end")}
      </Section>

      <Button href={v("ReorderURL")}>Volver a pedir lo mismo</Button>
      <Text style={{ ...small, marginTop: 20 }}>
        Revisaremos precios y existencias al momento de agregarlo a tu carrito. Si tu receta cambió, súbela antes de pagar.
      </Text>
    </Layout>
  );
}
