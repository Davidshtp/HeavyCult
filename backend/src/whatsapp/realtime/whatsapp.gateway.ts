import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';

const SALA_AGENTES = 'agentes';

function leerCookie(
  cabecera: string | undefined,
  nombre: string,
): string | null {
  if (!cabecera) return null;
  for (const parte of cabecera.split(';')) {
    const [clave, ...resto] = parte.trim().split('=');
    if (clave === nombre) {
      try {
        return decodeURIComponent(resto.join('='));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function tokenDelHandshake(client: Socket): string | null {
  const auth = client.handshake.auth as Record<string, unknown> | undefined;
  const desdeAuth = auth?.token;
  if (typeof desdeAuth === 'string' && desdeAuth.trim()) {
    return desdeAuth.trim().replace(/^Bearer\s+/i, '');
  }

  const desdeCabecera = client.handshake.headers.authorization;
  if (typeof desdeCabecera === 'string' && desdeCabecera.trim()) {
    return desdeCabecera.trim().replace(/^Bearer\s+/i, '');
  }

  return leerCookie(client.handshake.headers.cookie, 'jwt');
}

@WebSocketGateway({
  namespace: '/whatsapp',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class WhatsappGateway implements OnGatewayConnection {
  private readonly logger = new Logger(WhatsappGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = tokenDelHandshake(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const usuario = await this.authService.verificarToken(token);
      const datos = client.data as Record<string, unknown>;
      datos.usuario = usuario;
      await client.join(SALA_AGENTES);
    } catch {
      this.logger.warn('Handshake de WhatsApp rechazado por token inválido.');
      client.disconnect(true);
    }
  }

  emitirMensajeNuevo(payload: unknown): void {
    this.server?.to(SALA_AGENTES).emit('mensaje:nuevo', payload);
  }

  emitirEstadoMensaje(payload: unknown): void {
    this.server?.to(SALA_AGENTES).emit('mensaje:estado', payload);
  }

  emitirConversacionActualizada(payload: unknown): void {
    this.server?.to(SALA_AGENTES).emit('conversacion:actualizada', payload);
  }

  emitirQr(payload: unknown): void {
    this.server?.to(SALA_AGENTES).emit('instancia:qr', payload);
  }

  emitirEstadoInstancia(payload: unknown): void {
    this.server?.to(SALA_AGENTES).emit('instancia:estado', payload);
  }
}
