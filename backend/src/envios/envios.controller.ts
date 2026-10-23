import { Controller, Get, Injectable, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../user/entity/usuario.entity';
import { ListarMunicipiosDto } from './dto/envios.dto';
import { EnviosService } from './envios.service';

@Injectable()
@Controller('envios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class EnviosController {
  constructor(private readonly enviosService: EnviosService) {}

  @Get('departamentos')
  listarDepartamentos() {
    return {
      ok: true,
      departamentos: this.enviosService.listarDepartamentos(),
    };
  }

  @Get('municipios')
  listarMunicipios(@Query() query: ListarMunicipiosDto) {
    return {
      ok: true,
      municipios: this.enviosService.listarMunicipios(query.departamento_id),
    };
  }
}
