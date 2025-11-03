import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

type ProblemCode = 'VALIDATION_ERROR' | 'UPSTREAM_ERROR' | 'NOT_FOUND' | 'UNKNOWN_ERROR';

type ProblemResponse = {
  error: {
    code: ProblemCode;
    message: string;
    details?: unknown;
  };
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      response
        .status(status)
        .json(this.toProblem(status, exception.message, body));
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Unexpected error occurred';

    response
      .status(status)
      .json(this.toProblem(status, message, exception));
  }

  private toProblem(status: number, message: string, details?: unknown): ProblemResponse {
    let code: ProblemCode = 'UNKNOWN_ERROR';

    if (status >= 500) {
      code = 'UPSTREAM_ERROR';
    } else if (status === HttpStatus.NOT_FOUND) {
      code = 'NOT_FOUND';
    } else if (status === HttpStatus.BAD_REQUEST) {
      code = 'VALIDATION_ERROR';
    }

    return {
      error: {
        code,
        message,
        details,
      },
    };
  }
}
