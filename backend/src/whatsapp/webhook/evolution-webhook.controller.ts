import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WebhookService } from './webhook.service';

@Controller('whatsapp/webhooks')
export class EvolutionWebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('evolution')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async recibir(
    @Body() payload: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-webhook-secret') webhookSecret?: string,
  ) {
    await this.webhookService.recibir(payload, authorization ?? webhookSecret);
    return { ok: true };
  }
}
