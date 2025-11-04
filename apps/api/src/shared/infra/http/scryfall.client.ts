import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'undici';
import { LruCache } from '../cache/lru.cache';

const SCRYFALL_BASE_URL = 'https://api.scryfall.com/cards';
const DEFAULT_PAGE_SIZE = 24;
const MAX_RETRIES = 2;

export type ScryfallListResponse<T> = {
  data: T[];
  has_more?: boolean;
  next_page?: string;
  total_cards?: number;
};

export type ScryfallCard = {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  lang: string;
  rarity?: string;
  image_uris?: {
    small?: string;
    normal?: string;
  };
  card_faces?: Array<{
    image_uris?: {
      small?: string;
      normal?: string;
    };
  }>;
  prices?: {
    usd?: string;
    usd_foil?: string;
  };
};

class ScryfallError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

@Injectable()
export class ScryfallClient {
  private readonly cache: LruCache<unknown>;
  private readonly ttlMs: number;
  private readonly logger = new Logger(ScryfallClient.name);

  constructor(private readonly config: ConfigService) {
    this.ttlMs = this.config.get<number>('SCRYFALL_CACHE_TTL_MS') ?? 300_000;
    this.cache = new LruCache<unknown>(200, this.ttlMs);
  }

  async searchByNamePrefix(
    query: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<ScryfallListResponse<ScryfallCard>> {
    const params = new URLSearchParams({
      q: `name:${query}*`,
      page: String(page),
      order: 'name',
      dir: 'asc',
      unique: 'prints',
      include_extras: 'false',
      include_multilingual: 'true',
      include_variations: 'false',
    });

    params.set('page', String(page));
    params.set('order', 'name');

    const url = `${SCRYFALL_BASE_URL}/search?${params.toString()}&page_size=${pageSize}`;

    return (await this.getJson(url)) as ScryfallListResponse<ScryfallCard>;
  }

  async getById(id: string): Promise<ScryfallCard> {
    const url = `${SCRYFALL_BASE_URL}/${id}`;
    return (await this.getJson(url)) as ScryfallCard;
  }

  async findByName(name: string, setCode?: string): Promise<ScryfallCard> {
    const params = new URLSearchParams({
      fuzzy: name,
    });

    if (setCode) {
      params.set('set', setCode.toLowerCase());
    }

    const url = `${SCRYFALL_BASE_URL}/named?${params.toString()}`;
    return (await this.getJson(url)) as ScryfallCard;
  }

  async listPrints(cardId: string): Promise<ScryfallListResponse<ScryfallCard>> {
    const url = `${SCRYFALL_BASE_URL}/${cardId}/prints`;
    return (await this.getJson(url)) as ScryfallListResponse<ScryfallCard>;
  }

  private async getJson(url: string): Promise<unknown> {
    const cached = this.cache.get(url);
    if (cached) {
      return cached;
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await request(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'mtg-collection/0.1 (github.com/user/mtg-collection)',
            Accept: 'application/json',
          },
          throwOnError: false,
        });

        if (response.statusCode >= 500 || response.statusCode === 429) {
          throw new ScryfallError(
            `Upstream failure: ${response.statusCode}`,
            response.statusCode,
          );
        }

        if (response.statusCode >= 400) {
          const errorPayload = await response.body.text();
          throw new ScryfallError(
            errorPayload || `Upstream failure: ${response.statusCode}`,
            response.statusCode,
          );
        }

        const json = await response.body.json();

        this.cache.set(url, json);
        return json;
      } catch (error) {
        lastError = error;
        if (attempt === MAX_RETRIES) {
          break;
        }

        const delay = (attempt + 1) * 250;
        this.logger.warn(`Retrying Scryfall request (${attempt + 1}) ${url}: ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (lastError instanceof ScryfallError) {
      this.logger.warn(`Scryfall error for ${url}: ${lastError.message}`);
    } else {
      this.logger.error(`Unexpected Scryfall error for ${url}`, lastError as Error);
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Unknown error while requesting Scryfall');
  }
}
