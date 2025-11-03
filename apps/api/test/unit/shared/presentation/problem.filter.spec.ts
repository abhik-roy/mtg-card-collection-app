import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ProblemDetailsFilter } from '../../../../src/shared/presentation/problem.filter';

const createHost = () => {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const response = { status, json };

  const host: Partial<ArgumentsHost> = {
    switchToHttp: () =>
      ({
        getResponse: () => response,
        getRequest: jest.fn(),
        getNext: jest.fn(),
      }) as any,
  };

  return { host: host as ArgumentsHost, status, json };
};

describe('ProblemDetailsFilter', () => {
  it('formats HttpException payloads as problem details', () => {
    const { host, status, json } = createHost();
    const filter = new ProblemDetailsFilter();
    const exception = new HttpException('Invalid payload', HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
      }),
    });
  });

  it('handles unexpected errors', () => {
    const { host, status, json } = createHost();
    const filter = new ProblemDetailsFilter();
    const error = new Error('boom');

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'UPSTREAM_ERROR',
        message: 'boom',
      }),
    });
  });
});
