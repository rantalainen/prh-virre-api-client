import { HttpsAgent } from 'agentkeepalive';
import got, { Got, Response } from 'got';
import * as multipart from 'parse-multipart-data';

import {
  PrhVirreApiClientAccessToken,
  PrhVirreApiClientConfig,
  PrhVirreApiClientOptions,
  PrhVirreAuthResponse,
  PrhVirreFinancialPeriods,
  PrhVirreFinancialStatements
} from './interfaces';

// Create global https agent
const httpsAgent = new HttpsAgent();

export class PrhVirreApiClient {
  config: PrhVirreApiClientConfig;
  options: PrhVirreApiClientOptions;
  private accessToken?: PrhVirreApiClientAccessToken;

  /** Got instance to be used when making requests */
  gotInstance: Got;

  constructor(options: PrhVirreApiClientOptions, config: PrhVirreApiClientConfig) {
    this.options = options || {};
    this.config = config || {};

    // Set default config
    this.config.baseURL = this.config.baseURL || 'https://rekisteripalvelut.prh.fi:9193';
    this.config.timeout = this.config.timeout || 120000;

    // Make necessary validations to options
    if (!this.options.clientId) {
      throw new Error('Missing options.clientId');
    }
    if (!this.options.clientSecret) {
      throw new Error('Missing options.clientSecret');
    }
    if (!this.options.userName) {
      throw new Error('Missing options.userName');
    }
    if (!this.options.password) {
      throw new Error('Missing options.password');
    }

    // Use internal keepAliveAgent by default
    if (this.config.keepAliveAgent === true || this.config.keepAliveAgent === undefined) {
      this.config.keepAliveAgent = httpsAgent;
    }

    // Use internal dnsCache by default (falls back to got's dnsCache)
    if (this.config.dnsCache === true || this.config.dnsCache === undefined) {
      this.config.dnsCache = true;
    }

    // Set gotInstance defaults, can also include other options
    this.gotInstance = got.extend({
      // Agent options
      agent: { https: this.config.keepAliveAgent || undefined },

      // DNS caching options
      dnsCache: this.config.dnsCache || undefined,

      // Timeout
      timeout: this.config.timeout
    });
  }

  private resetAccessToken() {
    this.accessToken = undefined;
  }

  private async securityWorker() {
    let accessToken = this.accessToken;

    // Check if access token is expired
    if (!accessToken) {
      const body = {
        grant_type: 'password',
        username: this.options.userName,
        password: this.options.password,
        scope: 'openid profile email group_membership'
      };

      const basicAuth = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString('base64');

      // Generate test or production auth url
      const authUrl = this.config.baseURL?.includes('asi')
        ? 'https://auth.asi.prh.fi/oxauth/restv1/token'
        : 'https://auth.prh.fi/oxauth/restv1/token';

      // Get access token
      const response = await got.post<PrhVirreAuthResponse>(authUrl, {
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: body,
        resolveBodyOnly: true,
        responseType: 'json'
      });

      accessToken = {
        ...response,
        // Reset access token when it expires
        timeout: setTimeout(() => this.resetAccessToken(), response.expires_in * 1000)
      };
      this.accessToken = accessToken;
    }
  }

  /** Returns financial periods for one business id
   * @param businessId as valid finnish business id
   * @param register 'krek' for companies or 'srek' for foundations
   */
  async getFinancialPeriods(businessId: string, register: 'krek' | 'srek'): Promise<PrhVirreFinancialPeriods> {
    await this.securityWorker();

    const response = await this.gotInstance
      .get(`${this.config.baseURL}/ttfs/1.0.0/financialPeriods`, {
        headers: {
          Authorization: `Bearer ${this.accessToken!.access_token}`
        },
        searchParams: new URLSearchParams({
          businessId,
          register
        }),
        resolveBodyOnly: true,
        responseType: 'json'
      })
      .catch((error) => {
        if (error.response && error.response.body) {
          throw new Error(`An error occurred while fetching financial periods: ${JSON.stringify(error.response.body)}`);
        } else {
          throw error;
        }
      });

    return response as PrhVirreFinancialPeriods;
  }

  /** Returns financial statements for requested period
   * @param businessId as valid finnish business id
   * @param register 'krek' for companies or 'srek' for foundations
   * @param periodStartDate YYYY-MM-DD as start date of the financial period
   * @param periodEndDate YYYY-MM-DD as end date of the financial period
   */
  async getFinancialStatements(
    businessId: string,
    register: 'krek' | 'srek',
    periodStartDate: string,
    periodEndDate: string
  ): Promise<PrhVirreFinancialStatements> {
    await this.securityWorker();

    const formDataResponse = await this.gotInstance
      .get(`${this.config.baseURL}/ttfs/1.0.0/financialStatements`, {
        headers: {
          Authorization: `Bearer ${this.accessToken!.access_token}`
        },
        searchParams: new URLSearchParams({
          businessId,
          register,
          periodStartDate,
          periodEndDate
        })
      })
      .catch((error) => {
        if (error.response && error.response.body) {
          throw new Error(`An error occurred while fetching financial statements: ${JSON.stringify(error.response.body)}`);
        } else {
          throw error;
        }
      });

    return this.parseFormDataResponse(formDataResponse);
  }

  private parseFormDataResponse(result: Response<string>): PrhVirreFinancialStatements {
    if (!result.headers['content-type']) {
      throw new Error('No content-type header found in getFinancialStatements response');
    }

    const boundary = multipart.getBoundary(result.headers['content-type']);
    const parts = multipart.parse(result.rawBody, boundary);

    if (parts.length === 0) {
      throw new Error('No parts found in getFinancialStatements response');
    }

    const metadata = parts.shift();

    if (!metadata || !metadata.data) {
      throw new Error('No metadata found in getFinancialStatements response');
    }

    const data = JSON.parse(metadata.data.toString());

    const attachments = [];
    // Validate attachments
    for (const part of parts) {
      if (!part.filename || !part.type || !part.name || !part.data) {
        throw new Error('Invalid attachment found in getFinancialStatements response');
      }

      attachments.push({
        filename: part.filename,
        type: part.type,
        name: part.name,
        data: part.data
      });
    }

    return {
      metadata: data,
      attachments
    };
  }
}
