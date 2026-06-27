import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const initiallyOpen = () => {
    const out: Record<string, boolean> = {};
    for (const g of NAV) {
      if (g.children?.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"))) {
        out[g.label] = true;
      }
    }
    return out;
  };
  const [open, setOpen] = useState<Record<string, boolean>>(initiallyOpen);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname === to);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-brand-foreground font-black">
          H
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">HOMIQLO</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
            Super Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 text-sm">
        {NAV.map((group) => {
          const Icon = group.icon;
          if (!group.children) {
            const active = isActive(group.to!);
            return (
              <Link
                key={group.label}
                to={group.to!}
                onClick={onNavigate}
                className={cn(
                  "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                  active
                    ? "bg-brand text-brand-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{group.label}</span>
              </Link>
            );
          }
          const isOpen = open[group.label] ?? false;
          const childActive = group.children.some((c) => isActive(c.to));
          return (
            <div key={group.label} className="mb-0.5">
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [group.label]: !isOpen }))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 transition-colors",
                  childActive
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left font-medium">{group.label}</span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <div className="mt-0.5 ml-4 border-l border-sidebar-border pl-3">
                  {group.children.map((c) => {
                    const active = isActive(c.to);
                    return (
                      <Link
                        key={c.to}
                        to={c.to}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-[13px] transition-colors",
                          active
                            ? "bg-brand text-brand-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        )}
                      >
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-foreground/50">
        © {new Date().getFullYear()} HOMIQLO
      </div>
    </aside>
  );
}