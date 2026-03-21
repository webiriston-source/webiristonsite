import type { IncomingHttpHeaders } from "node:http";

/** Subset of Vercel serverless request shape used by this repo (no @vercel/node dependency). */
export type VercelRequestQuery = Record<string, string | string[] | undefined>;

export interface VercelRequest extends AsyncIterable<Buffer | string> {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
  query?: VercelRequestQuery;
}

/** Subset of Vercel serverless response API used here (chainable like Express-style helpers). */
export interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string | number | readonly string[]): VercelResponse;
  end(chunk?: string | Buffer, encoding?: BufferEncoding, cb?: () => void): void;
}
