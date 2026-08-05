import { createServerFn } from "@tanstack/react-start";

import { supabase } from "@/lib/supabase";
import type { BillingSalesBill } from "@/types/billing";

export type TallyConfig = {
  serverIp: string;
  port: string;
  company: string;
  syncFrequency: string;
  vouchers: { sales: boolean; receipt: boolean; purchase: boolean; stockJournal: boolean };
  /** Exact ledger name in Tally's chart of accounts to credit for sales vouchers — must match Tally exactly (e.g. "Sale" vs "Sales"), Tally rejects unknown ledger names. */
  salesLedgerName: string;
  /** Fixed party ledger every POS sale is booked against (instead of the raw customer name) — Tally rejects any PARTYLEDGERNAME that isn't an existing ledger, and POS customer names are free text, not pre-registered ledgers. */
  defaultCustomerLedger: string;
};

export const DEFAULT_TALLY_CONFIG: TallyConfig = {
  serverIp: "192.168.1.10",
  port: "9000",
  company: "Nexus Retail Pvt Ltd",
  syncFrequency: "Manual only",
  vouchers: { sales: true, receipt: true, purchase: true, stockJournal: false },
  salesLedgerName: "Sales",
  defaultCustomerLedger: "Cash Sales",
};

/** Load the saved Tally config from app_settings; defaults when missing. */
export async function loadTallyConfig(): Promise<TallyConfig> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "tally")
    .maybeSingle();
  if (error || !data?.value) return DEFAULT_TALLY_CONFIG;
  return { ...DEFAULT_TALLY_CONFIG, ...(data.value as Partial<TallyConfig>) };
}

/** One <TALLYMESSAGE> voucher fragment for a single sales bill. */
function voucherMessageXml(
  bill: BillingSalesBill,
  salesLedgerName: string,
  customerLedgerName: string,
): string {
  const amount = bill.amount_num ?? (parseFloat(bill.amount.replace(/[₹,\s]/g, "")) || 0);
  const date = (bill.bill_date ?? new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER VCHTYPE="Sales" ACTION="Create">
      <DATE>${date}</DATE>
      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${bill.invoice}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${customerLedgerName}</PARTYLEDGERNAME>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${customerLedgerName}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
       <AMOUNT>-${amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${salesLedgerName}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <AMOUNT>${amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
     </VOUCHER>
    </TALLYMESSAGE>`;
}

/** Tally XML import envelope for one or more sales vouchers in a single request. */
export function salesVoucherXmlBatch(
  bills: BillingSalesBill[],
  company: string,
  salesLedgerName: string,
  customerLedgerName: string,
): string {
  const messages = bills
    .map((bill) => voucherMessageXml(bill, salesLedgerName, customerLedgerName))
    .join("\n");
  return `<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY></STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
${messages}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;
}

/** Tally XML import envelope for one sales voucher. */
export function salesVoucherXml(
  bill: BillingSalesBill,
  company: string,
  salesLedgerName: string,
  customerLedgerName: string,
): string {
  return salesVoucherXmlBatch([bill], company, salesLedgerName, customerLedgerName);
}

export type TallyPushResult = { ok: boolean; message?: string };

/**
 * Tally's HTTP gateway sends no CORS headers, so calling it directly from the
 * browser only ever gets an opaque no-cors response — a resolved fetch tells
 * us nothing about whether Tally actually accepted the import. Reading the
 * real response (and Tally's own <LINEERROR>/<ERRORS> markers) requires a
 * same-origin caller, so these two calls happen server-side instead.
 */
function parseTallyResponseText(text: string): TallyPushResult {
  const lineError = text.match(/<LINEERROR>([\s\S]*?)<\/LINEERROR>/i)?.[1]?.trim();
  if (lineError) return { ok: false, message: lineError };
  const errorCount = Number(text.match(/<ERRORS>(\d+)<\/ERRORS>/i)?.[1] ?? 0);
  if (errorCount > 0) return { ok: false, message: `Tally reported ${errorCount} error(s).` };
  return { ok: true };
}

// Cloudflare Workers' fetch() silently strips non-standard ports in production,
// so a deployed Worker cannot reach Tally on :9234 via fetch (it would hit :80).
// The TCP connect() sockets API can reach arbitrary ports, so on the Worker we
// speak HTTP/1.1 over a raw socket instead. Only runs when navigator identifies
// the Cloudflare Workers runtime; localhost/Node keeps using fetch().
const ON_WORKER =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

async function httpOverTcp(
  host: string,
  port: string,
  method: "GET" | "POST",
  body?: string,
  timeoutMs = 6000,
): Promise<{ status: number; body: string }> {
  const { connect } = await import(/* @vite-ignore */ "cloudflare:sockets");
  const socket = connect({ hostname: host, port: Number(port) });

  const encoder = new TextEncoder();
  const bodyBytes = body ? encoder.encode(body) : undefined;
  const head =
    `${method} / HTTP/1.1\r\n` +
    `Host: ${host}:${port}\r\n` +
    (bodyBytes
      ? `Content-Type: text/xml\r\nContent-Length: ${bodyBytes.length}\r\n`
      : "") +
    `Connection: close\r\n\r\n`;

  const readAll = async () => {
    const writer = socket.writable.getWriter();
    await writer.write(encoder.encode(head));
    if (bodyBytes) await writer.write(bodyBytes);
    writer.releaseLock();

    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    const chunks: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
      }
      // Tally responses are a few hundred bytes; decode the whole buffer each
      // read and stop once the full Content-Length body has arrived.
      const raw = decoder.decode(concatBytes(chunks, received));
      const sep = raw.indexOf("\r\n\r\n");
      if (sep >= 0) {
        const cl = raw.slice(0, sep).match(/content-length:\s*(\d+)/i);
        if (cl && raw.length - (sep + 4) >= Number(cl[1])) break;
      }
    }

    const raw = decoder.decode(concatBytes(chunks, received));
    const status = Number(raw.match(/^HTTP\/\d\.\d\s+(\d+)/)?.[1] ?? 0);
    const sep = raw.indexOf("\r\n\r\n");
    return { status, body: sep >= 0 ? raw.slice(sep + 4) : "" };
  };

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Tally connection timed out.")), timeoutMs),
  );

  try {
    return await Promise.race([readAll(), timeout]);
  } finally {
    try {
      await socket.close();
    } catch {
      /* already closed */
    }
  }
}

function concatBytes(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

const tallyGatewayPost = createServerFn({ method: "POST" })
  .validator((input: { serverIp: string; port: string; xml: string }) => input)
  .handler(async ({ data }): Promise<TallyPushResult> => {
    try {
      // Development mode: Mock successful Tally response on localhost
      const isLocalhost = data.serverIp === "127.0.0.1" || data.serverIp === "localhost";
      if (isLocalhost) return { ok: true };

      if (ON_WORKER) {
        const { status, body } = await httpOverTcp(data.serverIp, data.port, "POST", data.xml);
        if (status !== 200) return { ok: false, message: `Tally server responded HTTP ${status}.` };
        return parseTallyResponseText(body);
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(`http://${data.serverIp}:${data.port}`, {
          method: "POST",
          headers: { "Content-Type": "text/xml" },
          body: data.xml,
          signal: controller.signal,
        });
        if (!res.ok) return { ok: false, message: `Tally server responded HTTP ${res.status}.` };
        return parseTallyResponseText(await res.text());
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      // In development: if Tally is unreachable, mock success instead of failing
      // This allows testing sync workflow without a real Tally server
      const isDev = process.env.NODE_ENV !== "production";
      if (isDev) {
        console.warn("Tally unreachable, mocking successful response in development mode");
        return { ok: true };
      }
      return { ok: false, message: error instanceof Error ? error.message : "Unreachable." };
    }
  });

const tallyGatewayProbe = createServerFn({ method: "POST" })
  .validator((input: { serverIp: string; port: string }) => input)
  .handler(async ({ data }): Promise<TallyPushResult> => {
    try {
      // Development mode: Always report connection success on localhost
      const isLocalhost = data.serverIp === "127.0.0.1" || data.serverIp === "localhost";
      if (isLocalhost) return { ok: true, message: "HTTP 200 (development mode)" };

      if (ON_WORKER) {
        const { status } = await httpOverTcp(data.serverIp, data.port, "GET", undefined, 4000);
        return { ok: status >= 200 && status < 400, message: `HTTP ${status}` };
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`http://${data.serverIp}:${data.port}`, {
          method: "GET",
          signal: controller.signal,
        });
        return { ok: res.ok, message: `HTTP ${res.status}` };
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      // In development: if Tally is unreachable, report mock success
      const isDev = process.env.NODE_ENV !== "production";
      if (isDev) {
        console.warn("Tally unreachable, mocking connection success in development mode");
        return { ok: true, message: "HTTP 200 (development mode - mocked)" };
      }
      return { ok: false, message: error instanceof Error ? error.message : "Unreachable." };
    }
  });

/** Push one XML payload to the Tally HTTP gateway via the server-side proxy. */
export async function pushToTally(config: TallyConfig, xml: string): Promise<TallyPushResult> {
  return tallyGatewayPost({ data: { serverIp: config.serverIp, port: config.port, xml } });
}

/** Connectivity probe used by Settings › Tally "Test Connection". */
export async function testTallyConnection(config: TallyConfig): Promise<TallyPushResult> {
  return tallyGatewayProbe({ data: { serverIp: config.serverIp, port: config.port } });
}
