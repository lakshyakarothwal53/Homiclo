import { Bell, Search, Menu, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROLE_LABEL } from "@/lib/roles";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenu}
        className="lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees, products, invoices…"
          className="h-9 pl-9 bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />
        </Button>
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold">{user?.name ?? "—"}</span>
          <span className="text-[11px] text-muted-foreground">{role ? ROLE_LABEL[role] : ""}</span>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background text-sm font-semibold">
          {user?.initials ?? "?"}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
