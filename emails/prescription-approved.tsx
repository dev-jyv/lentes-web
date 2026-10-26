import { Text } from "@react-email/components";
import { Button, h1, p, small, Layout } from "./components/layout";
import { v } from "./components/tpl";

// Receta aprobada.
export default function PrescriptionApproved() {
  return (
    <Layout preview="Tu receta fue aprobada">
      <Text style={h1}>Tu receta fue aprobada</Text>
      <Text style={p}>
        {v("CustomerName")}, revisamos la receta de {v("DoctorName")} y ya puedes usarla para comprar tus lentes.
      </Text>
      <Text style={small}>Vigente hasta {v("ExpiresAt")}.</Text>
      <div style={{ height: 14 }} />
      <Button href={v("WebURL")}>Ver lentes</Button>
      <Text style={{ ...small, marginTop: 20 }}>
        Puedes consultar el estado de tus recetas en <a href={v("RxURL")}>Mi receta</a>.
      </Text>
    </Layout>
  );
}
