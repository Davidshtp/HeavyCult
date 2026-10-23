import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Injectable,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolUsuario } from '../../user/entity/usuario.entity';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import { ShopifyPedidosService } from './pedidos.service';

/** Un GID de pedido de Shopify ("gid://shopify/Order/123") no es seguro en una URL. */
const GID_PEDIDO = /^gid:\/\/shopify\/Order\/\d+$/;

function normalizarIdPedido(id: string): string {
  const valor = id?.trim() ?? '';
  const decodificado = valor.includes('%')
    ? (() => {
        try {
          return decodeURIComponent(valor);
        } catch {
          return valor;
        }
      })()
    : valor;

  if (!GID_PEDIDO.test(decodificado)) {
    throw new HttpException(
      'El identificador del pedido no es un GID válido de Shopify.',
      HttpStatus.BAD_REQUEST,
    );
  }
  return decodificado;
}

@Injectable()
@Controller('shopify/pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class ShopifyPedidosController {
  constructor(private readonly pedidosService: ShopifyPedidosService) {}

  @Post()
  async crear(@Body() dto: CrearPedidoDto) {
    const resultado = await this.pedidosService.crearPedido(dto);
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_GATEWAY);
    }
    return { ok: true, mensaje: resultado.mensaje, pedido: resultado.pedido };
  }

  @Get()
  async listar(@Query('cursor') cursor?: string) {
    const resultado = await this.pedidosService.listar(cursor ?? null);
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_GATEWAY);
    }
    return { ok: true, pagina: resultado.pagina };
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    const resultado = await this.pedidosService.obtener(normalizarIdPedido(id));
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.NOT_FOUND);
    }
    return { ok: true, pedido: resultado.pedido };
  }
}
