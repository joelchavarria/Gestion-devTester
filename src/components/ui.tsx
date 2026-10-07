import clsx from "clsx";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  return <span className={clsx("badge", `badge-${tone}`)}>{children}</span>;
}

export function Avatar({ initials, tone = "mint" }: { initials: string; tone?: "mint" | "blue" | "purple" | "pink" | "navy" }) {
  return <span className={clsx("avatar", `avatar-${tone}`)}>{initials}</span>;
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-orb" />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
