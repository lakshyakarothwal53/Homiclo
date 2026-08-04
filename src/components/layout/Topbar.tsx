import { Bell, Search, Menu, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROLE_LABEL } from "@/lib/roles";
import { useState } from "react";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    signOut();
    navigate({ to: "/login" });
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes("employee")) {
      navigate({ to: "/employees" });
    } else if (lowerQuery.includes("invoice") || lowerQuery.includes("bill")) {
      navigate({ to: "/billing" });
    } else if (
      lowerQuery.includes("product") ||
      lowerQuery.includes("inventory") ||
      lowerQuery.includes("stock")
    ) {
      navigate({ to: "/inventory" });
    } else if (lowerQuery.includes("discount") || lowerQuery.includes("promo")) {
      navigate({ to: "/discounts" });
    } else if (lowerQuery.includes("attendance") || lowerQuery.includes("present")) {
      navigate({ to: "/attendance" });
    } else if (lowerQuery.includes("pos")) {
      navigate({ to: "/pos" });
    } else {
      navigate({ to: "/inventory/products" });
    }

    setSearchQuery("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(searchQuery);
    }
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          onClick={() => navigate({ to: "/notifications" })}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />
        </Button>
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold">
            {role === "super_admin" ? "Super Admin" : user?.name ?? "—"}
          </span>
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
