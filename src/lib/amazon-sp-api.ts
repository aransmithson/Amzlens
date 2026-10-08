/**
 * @file amazon-sp-api.ts
 * @description Amazon Selling Partner API (SP-API) Catalog Items client v2022-04-01 with LWA token exchange and error recovery.
 */

import { AmazonProduct, SPAPICredentials, SUPPORTED_MARKETPLACES } from '@/types/amazon';
import { logger } from './logger';

/**
 * Regional SP-API base endpoint URLs.
 */
const SP_API_ENDPOINTS: Record<string, string> = {
  'eu-west-1': 'https://sellingpartnerapi-eu.amazon.com',
  'us-east-1': 'https://sellingpartnerapi-na.amazon.com',
  'us-west-2': 'https://sellingpartnerapi-na.amazon.com',
  'ap-northeast-1': 'https://sellingpartnerapi-fe.amazon.com',
};

/**
 * In-memory cache for LWA access tokens to prevent redundant auth handshakes.
 */
interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}
const tokenCacheByRegion: Record<string, TokenCacheEntry> = {};

/**
 * Exchanges an LWA refresh token for a short-lived access token, respecting regional isolation (EU vs NA).
 *
 * @param {SPAPICredentials} creds - Selling partner credentials.
 * @param {string} [targetRegion='eu-west-1'] - AWS region for endpoint.
 * @returns {Promise<string>} Valid LWA access token for the target region.
 * @throws {Error} If token negotiation fails or region token is missing.
 */
export async function getLWAAccessToken(
  creds: SPAPICredentials,
  targetRegion = 'eu-west-1'
): Promise<string> {
  const isNorthAmerica = targetRegion === 'us-east-1' || targetRegion === 'us-west-2';
  const regionKey = isNorthAmerica ? 'NA' : 'EU';

  const refreshToken = isNorthAmerica
    ? creds.refreshTokenNA || creds.refreshToken
    : creds.refreshTokenEU || creds.refreshToken;

  if (!refreshToken) {
    const regionName = isNorthAmerica ? 'North America (USA/CA)' : 'Europe (UK/IT/FR/ES/DE/IE)';
    throw new Error(
      `Missing SP-API Refresh Token for ${regionName}. Amazon SP-API requires a distinct refresh token for North America vs Europe. Please configure it in Settings.`
    );
  }

  const now = Date.now();
  const cached = tokenCacheByRegion[regionKey];
  // Reuse token if still valid with a 2-minute safety window
  if (cached && cached.expiresAt > now + 120_000) {
    return cached.accessToken;
  }

  const tokenUrl = 'https://api.amazon.com/auth/o2/token';
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: refreshToken,
  });

  logger.info('SP-API-AUTH', `Requesting fresh LWA access token for region ${regionKey} from Amazon OAuth endpoint`);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('SP-API-AUTH', `Failed to retrieve LWA access token for region ${regionKey}`, {
      status: response.status,
      errorText,
    });
    throw new Error(`Amazon LWA Authentication failed for region ${regionKey} (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  tokenCacheByRegion[regionKey] = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Queries the Amazon Catalog Items API (2022-04-01) by UPC / EAN barcode.
 *
 * @param {string} barcode - Scanned UPC, EAN, or ISBN number.
 * @param {SPAPICredentials} creds - Amazon SP-API credentials.
 * @returns {Promise<AmazonProduct | null>} Found product details or null if no match found.
 */
interface SPAPIItem {
  asin: string;
  summaries?: Array<{
    marketplaceId: string;
    brand?: string;
    itemName?: string;
    itemClassification?: string;
    browseClassification?: { displayName: string };
  }>;
  images?: Array<{
    marketplaceId: string;
    images: Array<{ variant: string; link: string; height: number; width: number }>;
  }>;
  salesRanks?: Array<{
    marketplaceId: string;
    classificationRanks?: Array<{ title: string; rank: number }>;
  }>;
  attributes?: {
    bullet_point?: Array<{ value: string }>;
    list_price?: Array<{ value: number; currency: string }>;
    [key: string]: unknown;
  };
}

interface SPAPIResponse {
  numberOfResults: number;
  items?: SPAPIItem[];
}

type ValidIdentifierType = 'EAN' | 'UPC' | 'GTIN' | 'ISBN' | 'ASIN';

interface IdentifierCandidate {
  identifier: string;
  type: ValidIdentifierType;
}

/**
 * Performs a single catalog lookup attempt against Amazon SP-API.
 *
 * @param {string} identifier - Product identifier code.
 * @param {ValidIdentifierType} type - Expected SP-API identifier classification.
 * @param {SPAPICredentials} creds - Selling partner credentials.
 * @param {string} accessToken - Active LWA token.
 * @param {string} baseUrl - Regional SP-API URL.
 * @returns {Promise<SPAPIResponse | null>} Catalog response or null.
 */
async function fetchCatalogByCandidate(
  identifier: string,
  type: ValidIdentifierType,
  creds: SPAPICredentials,
  accessToken: string,
  baseUrl: string
): Promise<SPAPIResponse | null> {
  const queryParams = new URLSearchParams({
    identifiers: identifier,
    identifiersType: type,
    marketplaceIds: creds.marketplaceId,
    includedData: 'attributes,images,summaries,productTypes,salesRanks',
  });

  const requestUrl = `${baseUrl}/catalog/2022-04-01/items?${queryParams.toString()}`;

  logger.info('SP-API-CATALOG', `Searching catalog items for identifier: ${identifier} (type: ${type})`, {
    marketplaceId: creds.marketplaceId,
    identifiersType: type,
  });

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json',
      'User-Agent': 'AmazonProductInvestigator/1.0 (Language=TypeScript)',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error('SP-API-CATALOG', 'SP-API Catalog request failed', {
      status: response.status,
      type,
      errorBody,
    });
    throw new Error(`SP-API Catalog Error (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as SPAPIResponse;
}

/**
 * Queries the Amazon Catalog Items API (2022-04-01) by barcode with intelligent format resolution.
 *
 * @param {string} barcode - Scanned UPC, EAN, or ISBN number.
 * @param {SPAPICredentials} creds - Amazon SP-API credentials.
 * @returns {Promise<AmazonProduct | null>} Found product details or null if no match found.
 */
export async function querySPAPICatalog(
  barcode: string,
  creds: SPAPICredentials
): Promise<AmazonProduct | null> {
  const marketplace =
    SUPPORTED_MARKETPLACES.find((m) => m.id === creds.marketplaceId) || SUPPORTED_MARKETPLACES[0];
  const targetRegion = marketplace.region || creds.region || 'eu-west-1';
  const accessToken = await getLWAAccessToken(creds, targetRegion);
  const baseUrl = SP_API_ENDPOINTS[targetRegion] || SP_API_ENDPOINTS['eu-west-1'];

  // Build candidate search sequence to account for regional barcode differences (UPC vs zero-padded EAN vs GTIN)
  const candidates: IdentifierCandidate[] = [];

  if (barcode.length === 12) {
    candidates.push({ identifier: barcode, type: 'UPC' });
    candidates.push({ identifier: `0${barcode}`, type: 'EAN' });
    candidates.push({ identifier: `00${barcode}`, type: 'GTIN' });
  } else if (barcode.length === 13) {
    candidates.push({ identifier: barcode, type: 'EAN' });
    if (barcode.startsWith('978') || barcode.startsWith('979')) {
      candidates.push({ identifier: barcode, type: 'ISBN' });
    }
    if (barcode.startsWith('0')) {
      candidates.push({ identifier: barcode.slice(1), type: 'UPC' });
    }
    candidates.push({ identifier: `0${barcode}`, type: 'GTIN' });
  } else if (barcode.length === 10) {
    if (/^[A-Z0-9]{10}$/i.test(barcode)) {
      candidates.push({ identifier: barcode, type: 'ASIN' });
    }
    candidates.push({ identifier: barcode, type: 'ISBN' });
  } else if (barcode.length === 14) {
    candidates.push({ identifier: barcode, type: 'GTIN' });
  } else {
    candidates.push({ identifier: barcode, type: 'EAN' });
    candidates.push({ identifier: barcode, type: 'UPC' });
  }

  let foundData: SPAPIResponse | null = null;
  let matchedCandidate: IdentifierCandidate = candidates[0];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      const result = await fetchCatalogByCandidate(
        candidate.identifier,
        candidate.type,
        creds,
        accessToken,
        baseUrl
      );

      if (result && result.items && result.items.length > 0) {
        foundData = result;
        matchedCandidate = candidate;
        break;
      }
    } catch (err: unknown) {
      // If unauthorized or forbidden, do not continue querying candidates
      if (err instanceof Error && (err.message.includes('(401)') || err.message.includes('(403)'))) {
        throw err;
      }

      // If this is the last candidate, re-throw the error
      if (i === candidates.length - 1) {
        throw err;
      }
    }
  }

  if (!foundData || !foundData.items || foundData.items.length === 0) {
    logger.warn('SP-API-CATALOG', `Zero items returned for barcode ${barcode}`);
    return null;
  }

  const item = foundData.items[0];
  const summary =
    item.summaries?.find((s) => s.marketplaceId === creds.marketplaceId) || item.summaries?.[0];

  // Extract primary high-resolution product image
  const marketImages =
    item.images?.find((img) => img.marketplaceId === creds.marketplaceId) || item.images?.[0];
  const primaryImage =
    marketImages?.images?.find((i) => i.variant === 'MAIN') || marketImages?.images?.[0];
  const additionalImages = marketImages?.images?.slice(1, 4).map((i) => i.link) || [];

  // Extract sales rank
  const marketRanks =
    item.salesRanks?.find((r) => r.marketplaceId === creds.marketplaceId) || item.salesRanks?.[0];
  const topRank = marketRanks?.classificationRanks?.[0];

/**
 * Safely extracts a numeric price and formatted string from heterogeneous Amazon SP-API attribute structures.
 *
 * @param {unknown} rawPrice - Raw attribute object or array from SP-API.
 * @param {string} defaultCurrency - Currency code to fallback to.
 * @returns {{ amount: number; currency: string; formatted: string } | undefined} Sanitized price structure or undefined.
 */
function parseSPAPIPrice(
  rawPrice: unknown,
  defaultCurrency: string
): { amount: number; currency: string; formatted: string } | undefined {
  if (!rawPrice) return undefined;

  let target: Record<string, unknown> | null = null;
  if (Array.isArray(rawPrice) && rawPrice.length > 0 && typeof rawPrice[0] === 'object' && rawPrice[0] !== null) {
    target = rawPrice[0] as Record<string, unknown>;
  } else if (typeof rawPrice === 'object' && rawPrice !== null) {
    target = rawPrice as Record<string, unknown>;
  }

  if (!target) return undefined;

  // SP-API catalog price can be nested under value, amount, value_with_tax, or price
  const candidateNum =
    target.value ??
    target.amount ??
    target.value_with_tax ??
    target.price;

  const num =
    typeof candidateNum === 'number'
      ? candidateNum
      : typeof candidateNum === 'string'
      ? parseFloat(candidateNum)
      : NaN;

  if (isNaN(num)) return undefined;

  const currency = typeof target.currency === 'string' ? target.currency : defaultCurrency;
  const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  return {
    amount: Number(num.toFixed(2)),
    currency,
    formatted: `${symbol}${num.toFixed(2)}`,
  };
}

// Inside querySPAPICatalog
  // Extract bullet points from attributes if available
  const features = Array.isArray(item.attributes?.bullet_point)
    ? (item.attributes.bullet_point as Array<{ value: string }>).map((b) => b.value).filter(Boolean)
    : undefined;

  // Defensively extract pricing metadata
  const listPrice = parseSPAPIPrice(item.attributes?.list_price, marketplace.currency);
  const purchasablePrice = parseSPAPIPrice(
    item.attributes?.purchasable_offer || item.attributes?.buying_price,
    marketplace.currency
  );

  // Build multi-marketplace comparisons from SP-API item summaries
  const marketplaceComparisons: import('@/types/amazon').MarketplaceComparisonItem[] = SUPPORTED_MARKETPLACES.map((mp) => {
    const marketSummary = item.summaries?.find((s) => s.marketplaceId === mp.id);
    const marketRank = item.salesRanks?.find((r) => r.marketplaceId === mp.id)?.classificationRanks?.[0];
    const isFound = Boolean(marketSummary) || mp.id === creds.marketplaceId;

    return {
      marketplace: mp,
      asin: item.asin,
      found: isFound,
      salesRank: marketRank ? { rank: marketRank.rank, category: marketRank.title } : undefined,
      amazonUrl: `https://${mp.domain}/dp/${item.asin}`,
      price: isFound ? (purchasablePrice || listPrice) : undefined,
      listPrice: isFound ? listPrice : undefined,
      inStock: isFound,
    };
  });

  const product: AmazonProduct = {
    asin: item.asin,
    title: summary?.itemName || `Product ${item.asin}`,
    brand: summary?.brand,
    barcode,
    barcodeType: matchedCandidate.type,
    marketplaceId: marketplace.id,
    marketplaceName: marketplace.name,
    amazonUrl: `https://${marketplace.domain}/dp/${item.asin}`,
    imageUrl: primaryImage?.link,
    additionalImages,
    category: summary?.browseClassification?.displayName || summary?.itemClassification,
    salesRank: topRank ? { rank: topRank.rank, category: topRank.title } : undefined,
    features,
    price: purchasablePrice || listPrice,
    listPrice,
    inStock: true,
    dataSource: 'sp-api',
    marketplaceComparisons,
    scannedAt: new Date().toISOString(),
  };

  return product;
}
