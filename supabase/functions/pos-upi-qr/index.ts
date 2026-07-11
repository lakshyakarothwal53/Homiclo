// HOMIQLO — pos-upi-qr Edge Function
// Creates a per-bill dynamic UPI QR via Razorpay and reports its payment status,
// so the POS can show a QR the customer scans and confirm payment before printing.
//
// The Razorpay SECRET stays here (never in the browser).
// Deploy: supabase functions deploy pos-upi-qr --no-verify-jwt
// Secrets: supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx
// See README.md in this folder for setup.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    return json({ error: "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET secrets are not set" }, 500);
  }
  const auth = "Basic " + btoa(`${keyId}:${keySecret}`);

  try {
    const { action, amount, invoice, qrId } = await req.json();

    if (action === "create") {
      if (!amount || amount <= 0) return json({ error: "amount (in rupees) is required" }, 400);
      const res = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "upi_qr",
          name: "HOMIQLO POS",
          usage: "single_use",
          fixed_amount: true,
          payment_amount: Math.round(amount * 100), // paise
          description: invoice ? `Invoice ${invoice}` : "POS sale",
          close_by: Math.floor(Date.now() / 1000) + 30 * 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Razorpay qr_codes create failed:", res.status, JSON.stringify(data));
        return json({ error: data.error?.description ?? "Razorpay error", data }, res.status);
      }
      return json({ qrId: data.id, imageUrl: data.image_url, status: "created" });
    }

    if (action === "status") {
      if (!qrId) return json({ error: "qrId is required" }, 400);
      const res = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrId}`, {
        headers: { Authorization: auth },
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data.error?.description ?? "Razorpay error", data }, res.status);
      const paid = (data.payments_amount_received ?? 0) > 0 || data.status === "closed";
      // Fetch the payment id (UPI ref) once something has been received.
      let paymentRef: string | undefined;
      if (paid) {
        const pr = await fetch(
          `https://api.razorpay.com/v1/payments/qr_codes/${qrId}/payments`,
          { headers: { Authorization: auth } },
        );
        const pd = await pr.json();
        paymentRef = pd?.items?.[0]?.id;
      }
      return json({ paid, paymentRef, raw: data.status });
    }

    return json({ error: "unknown action (expected 'create' or 'status')" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
