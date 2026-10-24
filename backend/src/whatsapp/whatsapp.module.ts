import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { IntegracionModule } from '../integracion/integracion.module';
import { WhatsappConfiguracionController } from './configuracion/whatsapp-configuracion.controller';
import { WhatsappConfiguracionService } from './configuracion/whatsapp-configuracion.service';
import { ContactosController } from './contactos/contactos.controller';
import { ContactosService } from './contactos/contactos.service';
import { ConversacionesController } from './conversaciones/conversaciones.controller';
import { ConversacionesService } from './conversaciones/conversaciones.service';
import { PROVEEDOR_WHATSAPP } from './core/whatsapp-provider.interface';
import { Contacto } from './entity/contacto.entity';
import { Conversacion } from './entity/conversacion.entity';
import { EventoWhatsapp } from './entity/evento-whatsapp.entity';
import { Mensaje } from './entity/mensaje.entity';
import { WhatsappInstancia } from './entity/whatsapp-instancia.entity';
import { InstanciasController } from './instancias/instancias.controller';
import { InstanciasService } from './instancias/instancias.service';
import { MensajesService } from './mensajes/mensajes.service';
import { EvolutionClient } from './proveedores/evolution/evolution-client';
import { EvolutionMapper } from './proveedores/evolution/evolution.mapper';
import { EvolutionProveedor } from './proveedores/evolution/evolution-proveedor';
import { WhatsappGateway } from './realtime/whatsapp.gateway';
import { EvolutionWebhookController } from './webhook/evolution-webhook.controller';
import { WebhookService } from './webhook/webhook.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappInstancia,
      Contacto,
      Conversacion,
      Mensaje,
      EventoWhatsapp,
    ]),
    IntegracionModule,
    AuthModule,
  ],
  controllers: [
    EvolutionWebhookController,
    WhatsappConfiguracionController,
    InstanciasController,
    ContactosController,
    ConversacionesController,
  ],
  providers: [
    EvolutionClient,
    EvolutionMapper,
    EvolutionProveedor,
    {
      provide: PROVEEDOR_WHATSAPP,
      useExisting: EvolutionProveedor,
    },
    WhatsappConfiguracionService,
    InstanciasService,
    ContactosService,
    MensajesService,
    ConversacionesService,
    WebhookService,
    WhatsappGateway,
  ],
  exports: [InstanciasService, ConversacionesService, MensajesService],
})
export class WhatsappModule {}
