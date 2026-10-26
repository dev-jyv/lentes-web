import {
  Body, Button as EmailButton, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { v } from "./tpl";

// Paleta "Película lagrimal" del brand book. Los clientes de correo no soportan variables CSS ni modo oscuro fiable:
// se usan colores fijos y la tipografía del sistema (las fuentes web no cargan en la mayoría).
export const colors = {
  bg: "#F2F6F7", surface: "#FFFFFF", ink: "#0E2230", muted: "#566A75", line: "#D5DFE3",
  teal: "#0F7C8C", tealSoft: "#D6EEF1", amber: "#C9851F", amberSoft: "#F7E8CF",
};
export const fonts = {
  display: "'Avenir Next', 'Segoe UI', Helvetica, Arial, sans-serif",
  body: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace",
};

export function Layout({ preview, children, footer }: { preview: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Html lang="es-MX">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, margin: 0, padding: "24px 0", fontFamily: fonts.body, color: colors.ink }}>
        <Container style={{ maxWidth: 560, margin: "0 auto" }}>
          <Section style={{ padding: "0 8px 16px" }}>
            <Text style={{ margin: 0, fontFamily: fonts.display, fontSize: 24, fontWeight: 800, color: colors.ink, letterSpacing: "-0.02em" }}>
              <span style={{ color: colors.teal }}>◉</span> {v("BrandWordmark")}
            </Text>
          </Section>
          <Section style={{ backgroundColor: colors.surface, borderRadius: 12, border: `1px solid ${colors.line}`, padding: "28px 28px 24px" }}>
            {children}
          </Section>
          <Section style={{ padding: "16px 8px 0" }}>
            <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: colors.muted }}>
              {footer}
              <Hr style={{ borderColor: colors.line, margin: "12px 0" }} />
              {v("BrandName")} · Lentes de contacto en México ·{" "}
              <Link href={v("WebURL")} style={{ color: colors.muted }}>{v("WebHost")}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const h1 = { margin: "0 0 8px", fontFamily: fonts.display, fontSize: 24, lineHeight: "30px", fontWeight: 800, color: colors.ink } as const;
export const p = { margin: "0 0 14px", fontSize: 15, lineHeight: "23px", color: colors.ink } as const;
export const small = { margin: "0 0 4px", fontSize: 13, lineHeight: "19px", color: colors.muted } as const;
export const optic = { fontFamily: fonts.mono, fontSize: 12, color: colors.muted } as const;

export function Button({ href, children }: { href: string; children: ReactNode }) {
  return (
    <EmailButton
      href={href}
      style={{ backgroundColor: colors.teal, color: "#FFFFFF", borderRadius: 10, padding: "12px 22px", fontSize: 15, fontWeight: 600, textDecoration: "none", display: "inline-block" }}
    >
      {children}
    </EmailButton>
  );
}
