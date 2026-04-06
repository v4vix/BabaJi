import React, { CSSProperties, PropsWithChildren } from "react";

export function Surface(props: PropsWithChildren<{ title?: string; style?: CSSProperties }>) {
  return (
    <section
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-soft)",
        padding: 20,
        ...props.style,
      }}
    >
      {props.title ? (
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>{props.title}</h2>
      ) : null}
      {props.children}
    </section>
  );
}

export function Pill(props: PropsWithChildren<{ tone?: "primary" | "accent" }>) {
  const tone = props.tone === "accent" ? "var(--color-accent)" : "var(--color-primary)";
  return (
    <span
      style={{
        display: "inline-block",
        background: tone,
        color: "white",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
      }}
    >
      {props.children}
    </span>
  );
}
