import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { fxRates } from '../db/schema.js';
import { FALLBACK_FX_RATES, SUPPORTED_CURRENCIES } from '../lib/currencyUtils.js';

export const fxRatesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    try {
      const dbRates = await db.select().from(fxRates);

      if (dbRates.length > 0) {
        return reply.send({
          success: true,
          rates: dbRates,
        });
      }

      // If DB table is empty, return static corporate planning rates
      const fallbackList = SUPPORTED_CURRENCIES.map((code) => ({
        currencyCode: code,
        rateToUsd: FALLBACK_FX_RATES[code].toFixed(6),
        effectiveDate: '2026-01-01',
      }));

      return reply.send({
        success: true,
        rates: fallbackList,
      });
    } catch (error) {
      request.log.error(error, 'Error fetching FX rates');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve FX rates',
      });
    }
  });
};
