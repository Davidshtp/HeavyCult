import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { BREVO_API_KEY, MAIL_FROM, NODE_ENV } from '../config/constants';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendTemplateOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

/**
 * Interpreta el remitente en formato "Nombre <correo@dominio.com>" o
 * simplemente "correo@dominio.com".
 */
function parseRemitente(remitente: string): { name?: string; email: string } {
  const match = /^(.*?)\s*<([^>]+)>$/.exec(remitente.trim());
  if (match) {
    return {
      name: match[1].trim() || undefined,
      email: match[2].trim(),
    };
  }
  return { email: remitente.trim() };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(BREVO_API_KEY);

    if (apiKey) {
      this.apiKey = apiKey;
    } else {
      this.logger.warn(
        '[MailService] BREVO_API_KEY no configurada. Los envíos se simularán.',
      );
    }
  }

  /**
   * Envía un correo con plantilla handlebars a través de Brevo.
   * Si no hay API key devuelve `enviado: false` para que el
   * llamador pueda simular el flujo en desarrollo.
   */
  async sendTemplateMail({
    to,
    subject,
    template,
    context,
  }: SendTemplateOptions): Promise<{ enviado: boolean }> {
    const templatePath = path.join(__dirname, 'templates', `${template}.hbs`);
    const source = fs.readFileSync(templatePath, 'utf8');
    const compiled = handlebars.compile(source);
    const html = compiled(context);

    if (!this.apiKey) {
      const isProduction =
        this.configService.get<string>(NODE_ENV) === 'production';
      if (isProduction) {
        this.logger.error(
          '[MailService] BREVO_API_KEY no configurada pero el entorno es producción.',
        );
      } else {
        this.logger.warn(
          `[MailService] BREVO_API_KEY no configurada. Simulando envío a "${to}" (asunto: "${subject}").`,
        );
      }
      return { enviado: false };
    }

    const from = this.configService.get<string>(MAIL_FROM);
    const fromParsed = from ? parseRemitente(from) : null;

    if (!fromParsed?.email) {
      this.logger.warn(
        '[MailService] MAIL_FROM no configurado. No se envió el correo.',
      );
      return { enviado: false };
    }

    try {
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: fromParsed,
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const detalle = await response.text();
        this.logger.warn(
          `[MailService] Brevo respondió ${response.status} enviando a "${to}": ${detalle}`,
        );
        return { enviado: false };
      }

      return { enviado: true };
    } catch (error) {
      this.logger.error(
        `[MailService] Error al enviar correo a "${to}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { enviado: false };
    }
  }
}
