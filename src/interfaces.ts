import CacheableLookup from 'cacheable-lookup';
import https from 'https';

export interface PrhVirreApiClientOptions {
  clientId: string;
  clientSecret: string;
  userName: string;
  password: string;
}

export interface PrhVirreApiClientConfig {
  /**
   * API base url,
   * by default: `https://rekisteripalvelut.prh.fi:9193`.
   * Use `https://rekisteripalvelut.asi.prh.fi:9193` for testing.
   */
  baseURL?: string;
  /** Request timeout in milliseconds, defaults to 120000 (120 secs) */
  timeout?: number;
  /** Instance of `https.Agent` or `true` to enable internal Keep Alive Agent, defaults to `true` */
  keepAliveAgent?: boolean | https.Agent;
  /** Instance of `cacheable-lookup` or `true` to enable internal DNS cache, defaults to `true` */
  dnsCache?: boolean | CacheableLookup;
}

export interface PrhVirreApiClientAccessToken {
  access_token: string;
  expires_in: number;
  timeout: NodeJS.Timeout;
}

export interface PrhVirreAuthResponse {
  access_token: string;
  scope: string;
  id_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface PrhVirreFinancialPeriods {
  businessId: string;
  register: 'krek' | 'srek';
  companyName: string;
  financialPeriods: FinancialPeriod[];
}

interface FinancialPeriod {
  startDate: string;
  endDate: string;
}

export interface PrhVirreFinancialStatements {
  metadata: {
    businessId: string;
    register: 'krek' | 'srek';
    companyName: string;
    period: { startDate: string; endDate: string };
    documents: {
      id: string;
      recordNumber: string;
      fileFormat?: string;
      arrivalDate?: string;
      acceptanceDate?: string;
    }[];
  };
  attachments?: FinancialStatementAttachment[];
}

interface FinancialStatementAttachment {
  filename: string;
  type: string;
  name: string;
  data: Buffer;
}
