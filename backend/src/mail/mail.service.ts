import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import {
  MAIL_FROM,
  MAIL_HOST,
  MAIL_PASSWORD,
  MAIL_PORT,
  MAIL_USER,
  NODE_ENV,
} from '../config/constants';

interface SendTemplateOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>(MAIL_HOST);

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>(MAIL_PORT)) || 587,
        secure: Number(this.configService.get<string>(MAIL_PORT)) === 465,
        auth: {
          user: this.configService.get<string>(MAIL_USER),
          pass: this.configService.get<string>(MAIL_PASSWORD),
        },
      });
    }
  }

  /**
   * Envía un correo con plantilla handlebars.
   * Si no hay SMTP configurado devuelve `enviado: false` para que el
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

    if (!this.transporter) {
      const isProduction =
        this.configService.get<string>(NODE_ENV) === 'production';
      if (isProduction) {
        this.logger.error(
          '[MailService] No hay SMTP configurado pero el entorno es producción.',
        );
      } else {
        this.logger.warn(
          `[MailService] SMTP no configurado. Simulando envío a "${to}" (asunto: "${subject}").`,
        );
      }
      return { enviado: false };
    }

    const from = this.configService.get<string>(MAIL_FROM);

    await this.transporter.sendMail({
      from:
        from || `"HeavyCult" <${this.configService.get<string>(MAIL_USER)}>`,
      to,
      subject,
      html,
    });

    return { enviado: true };
  }
}
