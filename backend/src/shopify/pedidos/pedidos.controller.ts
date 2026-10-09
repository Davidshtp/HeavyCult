import {
  Body,
  Controller,
  Injectable,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  Integracion,
  PlataformaIntegracion,
} from '../../integracion/entity/integracion.entity';
import { RolUsuario } from '../../user/entity/usuario.entity';
import { ShopifyCredentialsService } from '../core/shopify-credentials.service';
import { ShopifyTokenService } from '../core/shopify-token.service';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import { ShopifyPedidosService, ResultadoPedido } from './pedidos.service';

/**
 * Alta de pedidos en Shopify. La ruta queda igual que antes:
 * `POST /auth/shopify/pedidos`.
 *
 * Si el token del pedido sale vencido se renueva una vez y se reintenta: es el
 * mismo reintento que ya hacía el controlador único.
 */
@Injectable()
@Controller('auth/shopify')
export class ShopifyPedidosController {
  constructor(
    private readonly shopifyService: ShopifyPedidosService,
    private readonly tokenService: ShopifyTokenService,
    private readonly credentialsService: ShopifyCredentialsService,
    @InjectRepository(Integracion)
    private readonly integracionRepository: Repository<Integracion>,
  ) {}

  @Post('pedidos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  async crearPedido(@Body() dto: CrearPedidoDto) {
    const { token, shop } = await this.obtenerDatosShopify();
    let resultado: ResultadoPedido = await this.shopifyService.crearPedido(
      token,
      shop,
      dto,
    );
    const renovado = await this.renovarSiTokenFallido(resultado);
    if (renovado) {
      resultado = await this.shopifyService.crearPedido(renovado, shop, dto);
    }
    return {
      ok: resultado.ok,
      mensaje: resultado.mensaje,
      pedido: resultado.pedido ?? null,
    };
  }

  private async obtenerDatosShopify(): Promise<{
    token: string;
    shop: string;
  }> {
    try {
      return await this.credentialsService.obtener();
    } catch (error) {
      throw new NotFoundException(
        error instanceof Error ? error.message : 'Shopify no está conectado.',
      );
    }
  }

  private async renovarSiTokenFallido(
    resultado: ResultadoPedido,
  ): Promise<string | null> {
    if (resultado.status !== 401) return null;

    const integracion = await this.integracionRepository.findOne({
      where: { plataforma: PlataformaIntegracion.SHOPIFY },
    });
    if (!integracion) return null;

    return this.tokenService.renovarAhora(integracion);
  }
}
