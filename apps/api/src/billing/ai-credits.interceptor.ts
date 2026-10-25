import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  HttpException,
  ServiceUnavailableException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { from, lastValueFrom, type Observable } from 'rxjs';
import { BillingService } from './billing.service';

@Injectable()
export class AiCreditsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AiCreditsInterceptor.name);
  constructor(private readonly billing: BillingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.billing.mode === 'disabled') return next.handle();
    const request = context.switchToHttp().getRequest<Request & { user: { id: string } }>();
    return from(this.execute(request, next));
  }

  private async execute(request: Request & { user: { id: string } }, next: CallHandler) {
    const requestId = request.header('Idempotency-Key') ?? randomUUID();
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId))
      throw new BadRequestException('Identificador de solicitud inválido.');
    const fingerprint = createHash('sha256')
      .update(request.path + ':' + JSON.stringify(request.body))
      .digest('hex');
    const userId = request.user.id;
    const reservation = await this.billing.reserve(userId, requestId, fingerprint);
    if (reservation.status === 'cached') return reservation.response;
    if (reservation.status === 'exhausted') this.billing.exhausted();
    if (reservation.status === 'conflict')
      throw new ConflictException('Esta solicitud ya corresponde a otros datos.');
    if (reservation.status === 'pending')
      throw new ConflictException({
        code: 'AI_REQUEST_PENDING',
        message: 'Esta solicitud sigue procesándose. Espera y reintenta sin generar otra.',
      });
    if (reservation.status === 'failed')
      throw new ConflictException({
        code: 'AI_REQUEST_FAILED',
        message: 'La solicitud anterior falló y el uso fue devuelto. Inicia un nuevo intento.',
      });
    if (reservation.status !== 'reserved')
      throw new ConflictException('No se pudo reservar el uso de IA.');
    let response: unknown;
    try {
      response = await lastValueFrom(next.handle());
    } catch (error) {
      try {
        await this.billing.finish(userId, requestId, false);
      } catch {
        this.logger.error('No se pudo devolver un uso de IA; revisar reservas pendientes.');
        throw new ServiceUnavailableException(
          'No se pudo confirmar la devolución del uso. Reintenta esta misma solicitud más tarde.',
        );
      }
      if (error instanceof HttpException) {
        const payload = error.getResponse();
        throw new HttpException(
          {
            ...(typeof payload === 'object' ? payload : { message: payload }),
            code: 'AI_OPERATION_FAILED',
          },
          error.getStatus(),
        );
      }
      throw new HttpException(
        {
          code: 'AI_OPERATION_FAILED',
          message: 'La solicitud falló y el uso fue devuelto. Intenta nuevamente.',
        },
        500,
      );
    }
    // If recording completion fails, keep the reservation charged: retrying must never rerun persisted work.
    await this.billing.finish(userId, requestId, true, response);
    return response;
  }
}
