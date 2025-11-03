import { ConfigService } from '@nestjs/config';
import { request } from 'undici';
import { ScryfallClient } from '../../../../../src/shared/infra/http/scryfall.client';

jest.mock('undici', () => ({
  request: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;

const createResponse = (statusCode: number, bodyJson: unknown) => ({
  statusCode,
  body: {
    json: jest.fn().mockResolvedValue(bodyJson),
    text: jest.fn().mockResolvedValue(JSON.stringify(bodyJson)),
  },
});

describe('ScryfallClient', () => {
  let client: ScryfallClient;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = new ConfigService({
      SCRYFALL_CACHE_TTL_MS: 5_000,
    });
    client = new ScryfallClient(config);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caches responses for identical requests', async () => {
    const payload = { id: 'card-123' };
    mockRequest.mockResolvedValue(createResponse(200, payload) as any);

    const first = await client.getById('card-123');
    const second = await client.getById('card-123');

    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('retries on temporary upstream failures', async () => {
    jest.useFakeTimers();
    const payload = { id: 'card-456' };
    mockRequest
      .mockResolvedValueOnce({
        statusCode: 500,
        body: {
          json: jest.fn(),
          text: jest.fn().mockResolvedValue('error'),
        },
      } as any)
      .mockResolvedValueOnce(createResponse(200, payload) as any);

    const promise = client.getById('card-456');
    await jest.runOnlyPendingTimersAsync();
    const result = await promise;

    expect(result).toEqual(payload);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('throws on client errors without caching', async () => {
    const errorPayload = { error: 'not found' };
    mockRequest.mockResolvedValue({
      statusCode: 404,
      body: {
        json: jest.fn(),
        text: jest.fn().mockResolvedValue(JSON.stringify(errorPayload)),
      },
    } as any);

    await expect(client.getById('unknown')).rejects.toThrow('{"error":"not found"}');
    expect(mockRequest).toHaveBeenCalledTimes(3);

    mockRequest.mockClear();

    mockRequest.mockResolvedValueOnce(createResponse(200, { id: 'card-789' }) as any);
    const result = await client.getById('card-789');

    expect(result).toEqual({ id: 'card-789' });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
