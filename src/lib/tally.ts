import { supabase } from "@/lib/supabase";
import type { BillingSalesBill } from "@/types/billing";

export type TallyConfig = {
  serverIp: string;
  port: string;
  company: string;
  syncFrequency: string;
  vouchers: { sales: boolean; receipt: boolean; purchase: boolean; stockJournal: boolean };
};

export const DEFAULT_TALLY_CONFIG: TallyConfig = {
  serverIp: "192.168.1.10",
  port: "9000",
  company: "Nexus Retail Pvt Ltd",
  syncFrequency: "Manual only",
  vouchers: { sales: true, receipt: true, purchase: true, stockJournal: false },
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

/** Tally XML import envelope for one sales voucher. */
export function salesVoucherXml(bill: BillingSalesBill, company: string): string {
  const amount = bill.amount_num ?? (parseFloat(bill.amount.replace(/[₹,\s]/g, "")) || 0);
  const date = (bill.bill_date ?? new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  return `<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY></STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER VCHTYPE="Sales" ACTION="Create">
      <DATE>${date}</DATE>
      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${bill.invoice}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${bill.customer}</PARTYLEDGERNAME>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${bill.customer}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
       <AMOUNT>-${amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>Sales</LEDGERNAME>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <AMOUNT>${amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
     </VOUCHER>
    </TALLYMESSAGE>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;
}

/**
 * Push one XML payload to the Tally HTTP gateway. `no-cors` because Tally's
 * gateway sends no CORS headers — a resolved fetch means the server was
 * reachable and accepted the POST; a rejection means unreachable.
 */
export async function pushToTally(
  config: TallyConfig,
  xml: string,
  timeoutMs = 4000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`http://${config.serverIp}:${config.port}`, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/xml" },
      body: xml,
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Connectivity probe used by Settings › Tally "Test Connection". */
export async function testTallyConnection(config: TallyConfig): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    await fetch(`http://${config.serverIp}:${config.port}`, {
      method: "GET",
      mode: "no-cors",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
