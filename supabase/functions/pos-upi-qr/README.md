# pos-upi-qr — dynamic UPI QR for POS checkout

Creates a per-bill UPI QR (amount pre-filled) via **Razorpay** and reports its
payment status, so the POS "Collect Payment" dialog can show a QR the customer
scans and confirm payment before printing the receipt. The Razorpay **secret key
stays in this function** — never in the browser bundle.

## Setup

1. Get **test** API keys from the Razorpay Dashboard → Settings → API Keys.
   (Razorpay QR Codes require UPI to be enabled on the account.)
2. Set the secrets:

   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx
   supabase secrets set RAZORPAY_KEY_SECRET=xxxxxxxx
   ```

3. Deploy:

   ```bash
   supabase functions deploy pos-upi-qr --no-verify-jwt
   ```

## Contract

`POST` with a JSON body:

- `{ "action": "create", "amount": 4616, "invoice": "INV-10249" }`
  → `{ "qrId": "qr_xxx", "imageUrl": "https://...png" }` (`amount` is in **rupees**)
- `{ "action": "status", "qrId": "qr_xxx" }`
  → `{ "paid": true, "paymentRef": "pay_xxx" }`

The client (`src/hooks/use-pos.ts` → `createUpiQr` / `checkUpiStatus`) calls this via
`supabase.functions.invoke("pos-upi-qr", …)` and polls `status` every ~3s.

## Switching gateway

To use PhonePe/Paytm instead, keep the same `create` / `status` contract and swap
the two `fetch` calls for that provider's QR + status APIs. No client change needed.
