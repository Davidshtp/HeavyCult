import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolUsuario } from '../../user/entity/usuario.entity';
import { GuardarConfiguracionWhatsappDto } from './dto/guardar-configuracion-whatsapp.dto';
import { WhatsappConfiguracionService } from './whatsapp-configuracion.service';

@Controller('whatsapp/configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class WhatsappConfiguracionController {
  constructor(
    private readonly configuracionService: WhatsappConfiguracionService,
  ) {}

  @Get()
  async obtener() {
    return this.configuracionService.obtener();
  }

  @Put()
  async guardar(@Body() dto: GuardarConfiguracionWhatsappDto) {
    return this.configuracionService.guardar(dto);
  }

  @Post('probar')
  async probar() {
    return this.configuracionService.probar();
  }
}
