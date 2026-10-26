import { Section, Text } from "@react-email/components";
import { Button, colors, h1, p, small, Layout } from "./components/layout";
import { v } from "./components/tpl";

// Receta rechazada, con el motivo que escribió quien la revisó.
export default function PrescriptionRejected() {
  return (
    <Layout preview="Necesitamos que vuelvas a subir tu receta">
      <Text style={h1}>No pudimos aprobar tu receta</Text>
      <Text style={p}>
        {v("CustomerName")}, revisamos la receta de {v("DoctorName")} y necesitamos que la subas de nuevo.
      </Text>
      <Section style={{ backgroundColor: colors.amberSoft, borderRadius: 10, padding: "12px 14px", margin: "0 0 18px" }}>
        <Text style={{ ...small, margin: 0, fontWeight: 700, color: colors.ink }}>Motivo</Text>
        <Text style={{ margin: 0, fontSize: 15, lineHeight: "22px" }}>{v("RejectReason")}</Text>
      </Section>
      <Button href={v("RxURL")}>Subir una nueva receta</Button>
      <Text style={{ ...small, marginTop: 20 }}>
        Una foto nítida y completa, con tus datos, la fecha y la firma del optometrista, ayuda a aprobarla más rápido.
      </Text>
    </Layout>
  );
}
