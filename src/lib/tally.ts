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

const tallyGatewayPost = createServerFn({ method: "POST" })
  .validator((input: { serverIp: string; port: string; xml: string }) => input)
  .handler(async ({ data }): Promise<TallyPushResult> => {
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
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unreachable." };
    } finally {
      clearTimeout(timer);
    }
  });

const tallyGatewayProbe = createServerFn({ method: "POST" })
  .validator((input: { serverIp: string; port: string }) => input)
  .handler(async ({ data }): Promise<TallyPushResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`http://${data.serverIp}:${data.port}`, {
        method: "GET",
        signal: controller.signal,
      });
      return { ok: res.ok, message: `HTTP ${res.status}` };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unreachable." };
    } finally {
      clearTimeout(timer);
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
