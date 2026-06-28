import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast, Toaster } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSession } from "@/lib/auth";
import { roleHome, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — HOMIQLO" },
      { name: "description", content: "Sign in to your HOMIQLO role dashboard." },
    ],
  }),
  beforeLoad: () => {
    const user = getSession();
    if (user) throw redirect({ to: roleHome(user.role) });
  },
  component: LoginPage,
});

type RoleCard = {
  role: Role;
  label: string;
  code: string;
  email: string;
  password: string;
};

const ROLE_CARDS: RoleCard[] = [
  {
    role: "super_admin",
    label: "Super Admin",
    code: "SA",
    email: "admin@homiqlo.co",
    password: "admin123",
  },
  {
    role: "store_manager",
    label: "Store Mgr",
    code: "SM",
    email: "manager@homiqlo.co",
    password: "mgr123",
  },
  {
    role: "inventory",
    label: "Inventory",
    code: "IM",
    email: "inv@homiqlo.co",
    password: "inv123",
  },
  {
    role: "cashier",
    label: "Cashier",
    code: "PO",
    email: "cashier@homiqlo.co",
    password: "cash123",
  },
];

const FEATURES = [
  { title: "Role-based dashboards", desc: "Tailored views & permissions per role" },
  { title: "Real-time operations", desc: "Attendance, sales, inventory at a glance" },
  { title: "Secure & auditable", desc: "Login monitoring & activity tracking" },
];

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role>("super_admin");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@homiqlo.co", password: "admin123", remember: true },
  });

  const remember = watch("remember");

  const pickRole = (card: RoleCard) => {
    setSelected(card.role);
    setValue("email", card.email, { shouldValidate: true });
    setValue("password", card.password, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const user = await signIn(values.email, values.password);
      navigate({ to: roleHome(user.role) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-brand/80 to-black p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-lg font-black backdrop-blur">
            H
          </div>
          <span className="text-lg font-bold tracking-tight">HOMIQLO</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            One portal.
            <br />
            Every role. Every workflow.
          </h1>
          <p className="mt-4 text-sm text-white/80">
            Sign in to access your role-specific dashboard — Super Admin, Store Manager, Inventory
            or Cashier — all in one unified system.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                  <Check className="h-3 w-3" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{f.title}</span>
                  <span className="block text-xs text-white/70">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/50">© {new Date().getFullYear()} HOMIQLO · v1.0</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select your role and sign in to continue.
          </p>

          {/* Role cards */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROLE_CARDS.map((card) => {
              const active = selected === card.role;
              return (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => pickRole(card)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors",
                    active
                      ? "border-brand bg-brand/5"
                      : "border-input hover:border-brand/40 hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg text-xs font-bold",
                      active ? "bg-brand text-brand-foreground" : "bg-secondary text-foreground",
                    )}
                  >
                    {card.code}
                  </span>
                  <span className="text-[11px] font-medium leading-tight">{card.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email or Employee ID</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setValue("remember", v === true)}
                />
                Remember me
              </label>
              <button type="button" className="text-sm font-medium text-brand hover:underline">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Demo mode — pick a role above and click sign in to explore that dashboard.
          </p>
        </div>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
