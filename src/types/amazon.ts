/**
 * @file amazon.ts
 * @description Data models and TypeScript types for Amazon catalog products, barcode scanner results, and SP-API credentials.
 */

export type BarcodeFormat =
  | 'ean_13'
  | 'ean_8'
  | 'upc_a'
  | 'upc_e'
  | 'code_128'
  | 'code_39'
  | 'qr_code'
  | 'unknown';

export interface SPAPICredentials {
  clientId: string;
  clientSecret: string;
  refreshToken?: string; // Legacy fallback
  refreshTokenEU?: string; // UK, DE, FR, IT, ES, IE
  refreshTokenNA?: string; // USA, CA
  marketplaceId: string;
  region: 'eu-west-1' | 'us-east-1' | 'us-west-2' | 'ap-northeast-1';
}

export interface LookupRequest {
  barcode: string;
  marketplaceId?: string;
  credentials?: Partial<SPAPICredentials>;
  forceMock?: boolean;
  compareAll?: boolean;
}

export interface LookupResponse {
  success: boolean;
  data?: AmazonProduct;
  error?: string;
  details?: string;
}

export interface MarketplaceComparisonItem {
  marketplace: MarketplaceConfig;
  asin?: string;
  found: boolean;
  price?: {
    amount: number;
    currency: string;
    formatted: string;
  };
  listPrice?: {
    amount: number;
    currency: string;
    formatted: string;
  };
  salesRank?: {
    rank: number;
    category: string;
  };
  amazonUrl: string;
  inStock?: boolean;
}

export interface AmazonProduct {
  asin: string;
  title: string;
  brand?: string;
  barcode: string;
  barcodeType: string;
  marketplaceId: string;
  marketplaceName: string;
  amazonUrl: string;
  imageUrl?: string;
  additionalImages?: string[];
  price?: {
    amount: number;
    currency: string;
    formatted: string;
  };
  listPrice?: {
    amount: number;
    currency: string;
    formatted: string;
  };
  category?: string;
  salesRank?: {
    rank: number;
    category: string;
  };
  attributes?: Record<string, string>;
  features?: string[];
  inStock?: boolean;
  buyBoxWinner?: string;
  rating?: number;
  reviewCount?: number;
  dataSource: 'sp-api' | 'mock-catalog';
  scannedAt: string;
  marketplaceComparisons?: MarketplaceComparisonItem[];
}

export interface MarketplaceConfig {
  id: string;
  name: string;
  code: string;
  flag: string;
  currency: string;
  domain: string;
  region: 'eu-west-1' | 'us-east-1' | 'us-west-2' | 'ap-northeast-1';
}

export const SUPPORTED_MARKETPLACES: MarketplaceConfig[] = [
  {
    id: 'ATVPDKIKX0DER',
    name: 'United States (USA)',
    code: 'USA',
    flag: '🇺🇸',
    currency: 'USD',
    domain: 'amazon.com',
    region: 'us-east-1',
  },
  {
    id: 'A1F83G8C2ARO7P',
    name: 'United Kingdom (UK)',
    code: 'UK',
    flag: '🇬🇧',
    currency: 'GBP',
    domain: 'amazon.co.uk',
    region: 'eu-west-1',
  },
  {
    id: 'APJ6JRA9NG5V4',
    name: 'Italy (IT)',
    code: 'IT',
    flag: '🇮🇹',
    currency: 'EUR',
    domain: 'amazon.it',
    region: 'eu-west-1',
  },
  {
    id: 'A13V1IB3VIYZZH',
    name: 'France (FR)',
    code: 'FR',
    flag: '🇫🇷',
    currency: 'EUR',
    domain: 'amazon.fr',
    region: 'eu-west-1',
  },
  {
    id: 'A1RKKUPIHCS9HS',
    name: 'Spain (ES)',
    code: 'ES',
    flag: '🇪🇸',
    currency: 'EUR',
    domain: 'amazon.es',
    region: 'eu-west-1',
  },
  {
    id: 'A1PA6795UKMFR9',
    name: 'Germany (DE)',
    code: 'DE',
    flag: '🇩🇪',
    currency: 'EUR',
    domain: 'amazon.de',
    region: 'eu-west-1',
  },
  {
    id: 'A28R8C7GAPY1TF',
    name: 'Ireland (IE)',
    code: 'IE',
    flag: '🇮🇪',
    currency: 'EUR',
    domain: 'amazon.ie',
    region: 'eu-west-1',
  },
  {
    id: 'A2EUQ1WTGCTBG2',
    name: 'Canada (CA)',
    code: 'CA',
    flag: '🇨🇦',
    currency: 'CAD',
    domain: 'amazon.ca',
    region: 'us-east-1',
  },
];
