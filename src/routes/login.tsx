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

// Role tiles select which role is being signed in as — they deliberately carry
// NO credentials. Pre-filling a working email/password on a login screen hands
// anyone who opens the page a valid account.
type RoleCard = {
  role: Role;
  label: string;
  code: string;
};

const ROLE_CARDS: RoleCard[] = [
  { role: "super_admin", label: "Super Admin", code: "SA" },
  { role: "branch_admin", label: "Branch Admin", code: "BA" },
  { role: "store_manager", label: "Store Mgr", code: "SM" },
  { role: "inventory", label: "Inventory", code: "IM" },
  { role: "cashier", label: "Cashier", code: "PO" },
  { role: "employee", label: "Employee", code: "EMP" },
  { role: "hr", label: "HR Manager", code: "HR" },
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
    // Blank: credentials are never pre-filled.
    defaultValues: { email: "", password: "", remember: true },
  });

  const remember = watch("remember");

  const onSubmit = async (values: FormValues) => {
    try {
      // The selected role is enforced server-side of the auth boundary: signIn
      // rejects credentials whose account has a different role, and does so
      // before any session cookie is written.
      const user = await signIn(values.email, values.password, selected);
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
            Sign in to access your role-specific dashboard — Super Admin, Store Manager, Inventory,
            Cashier, Employee or HR Manager — all in one unified system.
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
          <div className="mt-6 grid grid-cols-2 gap-6">
            {[0, 1].map((colIndex) => (
              <div key={colIndex} className="space-y-2">
                {ROLE_CARDS.slice(colIndex * 3, (colIndex + 1) * 3).map((card) => {
                  const active = selected === card.role;
                  return (
                    <button
                      key={card.role}
                      type="button"
                      onClick={() => setSelected(card.role)}
                      className={cn(
                        "w-full flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors",
                        active
                          ? "border-brand bg-brand/5"
                          : "border-input hover:border-brand/40 hover:bg-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-lg text-xs font-bold",
                          active
                            ? "bg-brand text-brand-foreground"
                            : "bg-secondary text-foreground",
                        )}
                      >
                        {card.code}
                      </span>
                      <span className="text-[11px] font-medium leading-tight">{card.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* autoComplete="off" + a non-standard name stops the browser's saved
              -password manager from re-filling these on load. Chrome ignores
              "off" on fields it recognises as a login pair, so the password
              field claims "new-password", which it does honour. */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 space-y-4"
            autoComplete="off"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email or Employee ID</Label>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
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
            Select the role your account belongs to, then sign in with your own credentials.
          </p>
        </div>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
