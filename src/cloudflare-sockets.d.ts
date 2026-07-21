// Minimal ambient types for the Cloudflare Workers TCP sockets API, used only
// by the server-side Tally push in src/lib/tally.ts. Avoids pulling in the full
// @cloudflare/workers-types package for a single import.
declare module "cloudflare:sockets" {
  export interface Socket {
    readonly readable: ReadableStream<Uint8Array>;
    readonly writable: WritableStream<Uint8Array>;
    close(): Promise<void>;
  }
  export interface SocketAddress {
    hostname: string;
    port: number;
  }
  export function connect(address: SocketAddress): Socket;
}
