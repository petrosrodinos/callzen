/* Unit-test stand-in for the NestJS packages (mapped in the Jest config). NestJS 12 ships as ESM, which Jest
   on Node 22 cannot require. Unit specs exercise service logic with hand-made collaborators, so decorators
   become no-ops and exceptions keep their response payload and status for assertions. */

class Logger {
  constructor(_context?: string) {}
  log() {}
  warn() {}
  error() {}
  debug() {}
  verbose() {}
}

class HttpException extends Error {
  constructor(
    public readonly response: unknown = 'error',
    public readonly status = 500,
  ) {
    super(
      typeof response === 'string'
        ? response
        : String((response as { message?: string })?.message ?? 'error'),
    );
  }
  getResponse() {
    return this.response;
  }
  getStatus() {
    return this.status;
  }
}

const STATUS: Record<string, number> = {
  BadRequestException: 400,
  UnauthorizedException: 401,
  ForbiddenException: 403,
  NotFoundException: 404,
  ConflictException: 409,
  ServiceUnavailableException: 503,
};

const exceptions = new Map<string, unknown>();
const exceptionClass = (name: string) => {
  if (!exceptions.has(name)) {
    const status = STATUS[name] ?? 500;
    exceptions.set(
      name,
      class extends HttpException {
        constructor(response?: unknown) {
          super(response, status);
          this.name = name;
        }
      },
    );
  }
  return exceptions.get(name);
};

const noopDecorator = () => () => undefined;

module.exports = new Proxy(
  {},
  {
    get(_target, property) {
      const name = String(property);
      if (name === '__esModule') return true;
      if (name === 'Logger') return Logger;
      if (name === 'HttpException') return HttpException;
      if (name.endsWith('Exception')) return exceptionClass(name);
      if (name === 'WorkerHost') return class {};
      return noopDecorator;
    },
  },
);
