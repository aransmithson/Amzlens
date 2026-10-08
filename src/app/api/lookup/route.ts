/**
 * @file route.ts
 * @description API endpoint /api/lookup handling barcode queries against Amazon SP-API Catalog or Demo engine.
 */

import { NextRequest, NextResponse } from 'next/server';
import { LookupRequest, LookupResponse, SPAPICredentials } from '@/types/amazon';
import { querySPAPICatalog } from '@/lib/amazon-sp-api';
import { lookupMockProduct } from '@/lib/mock-catalog';
import { logger } from '@/lib/logger';

/**
 * Normalizes input barcode strings by trimming whitespace, dashes, and invisible control characters.
 *
 * @param {string} raw - Raw scanned barcode string.
 * @returns {string} Sanitized barcode number.
 */
function cleanBarcode(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, '').trim();
}

/**
 * Handles barcode investigation requests.
 *
 * @param {NextRequest} req - Next.js HTTP request.
 * @returns {Promise<NextResponse<LookupResponse>>} JSON response with product metadata or failure reason.
 */
export async function POST(req: NextRequest): Promise<NextResponse<LookupResponse>> {
  try {
    const body = (await req.json()) as LookupRequest;
    const { barcode: rawBarcode, marketplaceId = 'A1F83G8C2ARO7P', forceMock = false } = body;

    if (!rawBarcode || typeof rawBarcode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid barcode string is required.' },
        { status: 400 }
      );
    }

    const barcode = cleanBarcode(rawBarcode);

    if (barcode.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid barcode "${rawBarcode}". Barcodes must be at least 6 digits.`,
        },
        { status: 400 }
      );
    }

    logger.info('LOOKUP-ROUTE', `Processing product investigation for barcode: ${barcode}`, {
      marketplaceId,
      forceMock,
    });

    // Check for SP-API credentials from request payload or server environment variables
    const clientId = body.credentials?.clientId || process.env.SP_API_CLIENT_ID;
    const clientSecret = body.credentials?.clientSecret || process.env.SP_API_CLIENT_SECRET;
    const refreshTokenEU =
      body.credentials?.refreshTokenEU || body.credentials?.refreshToken || process.env.SP_API_REFRESH_TOKEN;
    const refreshTokenNA =
      body.credentials?.refreshTokenNA || process.env.SP_API_REFRESH_TOKEN_NA || process.env.SP_API_REFRESH_TOKEN_USA;
    const region = (body.credentials?.region || process.env.SP_API_REGION || 'eu-west-1') as SPAPICredentials['region'];

    const hasCredentials = Boolean(clientId && clientSecret && (refreshTokenEU || refreshTokenNA));

    // If explicit Mock mode requested or credentials absent, query the simulated catalog
    if (forceMock || !hasCredentials) {
      logger.info('LOOKUP-ROUTE', 'Serving product lookup using simulated catalog engine', {
        reason: forceMock ? 'forced-mock' : 'no-credentials-supplied',
      });

      const product = lookupMockProduct(barcode, marketplaceId);
      return NextResponse.json({
        success: true,
        data: product,
      });
    }

    // SP-API live query path
    try {
      const creds: SPAPICredentials = {
        clientId: clientId!,
        clientSecret: clientSecret!,
        refreshToken: refreshTokenEU || refreshTokenNA,
        refreshTokenEU,
        refreshTokenNA,
        marketplaceId,
        region,
      };

      const product = await querySPAPICatalog(barcode, creds);

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: `Product with barcode ${barcode} was not found in Amazon Catalog (Marketplace: ${marketplaceId}).`,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: product,
      });
    } catch (spApiError: unknown) {
      const errorMessage = spApiError instanceof Error ? spApiError.message : 'Unknown SP-API Error';
      logger.error('LOOKUP-ROUTE', 'SP-API query failed, falling back to mock recommendation', {
        errorMessage,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Amazon SP-API Error: ${errorMessage}`,
          details: 'Please check your LWA Client ID, Secret, and Refresh Token in Settings, or enable Demo Mode.',
        },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    logger.error('LOOKUP-ROUTE', 'Fatal lookup error', { msg });

    return NextResponse.json(
      {
        success: false,
        error: `Investigation failed: ${msg}`,
      },
      { status: 500 }
    );
  }
}
