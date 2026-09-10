import styles from "./management.module.css";
export function shortSource(source: string) { return source.replace(/\.(md|pdf)$/, "").replaceAll("-", " ").replaceAll("_", " "); }
export function time(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value)); }
export function Percent({ value, total }: { value: number; total: number }) { return <>{total ? Math.round(value / total * 100) + "%" : "—"}</>; }
export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" }) { return <span className={`${styles.tag} ${styles[tone]}`}>{children}</span>; }
export function Metric({ label, value, note, icon }: { label: string; value: React.ReactNode; note: string; icon: React.ReactNode }) {
  return <section className={styles.metric}><div><h2>{label}</h2><span aria-hidden="true">{icon}</span></div><strong>{value}</strong><p>{note}</p></section>;
}
