import { createFileRoute, redirect } from "@tanstack/react-router";

// The Impact IHS310X is a 1D scanner and the app generates no QR codes, so the
// dedicated QR page has been retired. Kept as a redirect so old links/bookmarks
// land on the camera-scan (barcode) fallback instead of 404-ing.
export const Route = createFileRoute("/_app/pos/qr")({
  beforeLoad: () => {
    throw redirect({ to: "/pos/barcode" });
  },
});
