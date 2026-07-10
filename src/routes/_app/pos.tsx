import { createFileRoute, Outlet } from "@tanstack/react-router";

import { CartProvider } from "@/components/pos/CartProvider";

export const Route = createFileRoute("/_app/pos")({
  component: PosLayout,
});

function PosLayout() {
  return (
    <CartProvider>
      <Outlet />
    </CartProvider>
  );
}
