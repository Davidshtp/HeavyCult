import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolUsuario } from '../../user/entity/usuario.entity';
import {
  ActualizarGarantiaDto,
  ActualizarProductoDto,
  ActualizarVariantesDto,
  AgregarImagenDto,
  ListarProductosDto,
  ReordenarImagenesDto,
} from './dto/productos.dto';
import { ShopifyProductosService } from './productos.service';

/**
 * Un GID de Shopify ("gid://shopify/Product/123") no es seguro dentro de una
 * URL: el frontend lo codifica con encodeURIComponent para que Express no lo
 * confunda con un separador de ruta. Si un cliente manda el id ya codificado,
 * el servicio recibe "gid%3A%2F%2Fshopify%2FProduct%2F123" y Shopify lo
 * rechaza con un error de variable ID poco claro. Decodificar es seguro: un GID
 * real nunca contiene "%".
 */
const GID_PRODUCTO = /^gid:\/\/shopify\/Product\/\d+$/;

function normalizarIdProducto(id: string): string {
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

  if (!GID_PRODUCTO.test(decodificado)) {
    throw new HttpException(
      'El identificador del producto no es un GID válido de Shopify.',
      HttpStatus.BAD_REQUEST,
    );
  }
  return decodificado;
}

@Injectable()
@Controller('shopify/productos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class ShopifyProductosController {
  constructor(private readonly productosService: ShopifyProductosService) {}

  @Get()
  async listar(@Query() query: ListarProductosDto) {
    await this.asegurarCatalogo();
    return {
      ...this.productosService.listar(query),
      resumen: this.productosService.resumen(),
    };
  }
  @Post('sincronizar')
  async sincronizar() {
    const resultado = await this.productosService.sincronizar();
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_GATEWAY);
    }
    return {
      ok: true,
      mensaje: resultado.mensaje,
      productos: resultado.productos,
      resumen: this.productosService.resumen(),
    };
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    const resultado = await this.productosService.obtener(
      normalizarIdProducto(id),
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.NOT_FOUND);
    }
    return { ok: true, producto: resultado.producto };
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarProductoDto,
  ) {
    const resultado = await this.productosService.actualizar(
      normalizarIdProducto(id),
      dto,
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_REQUEST);
    }
    return resultado;
  }

  @Patch(':id/variantes')
  async actualizarVariantes(
    @Param('id') id: string,
    @Body() dto: ActualizarVariantesDto,
  ) {
    const resultado = await this.productosService.actualizarVariantes(
      normalizarIdProducto(id),
      dto,
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_REQUEST);
    }
    return resultado;
  }

  /** La garantía es un metafield, por eso va en su propia ruta. */
  @Patch(':id/garantia')
  async actualizarGarantia(
    @Param('id') id: string,
    @Body() dto: ActualizarGarantiaDto,
  ) {
    const resultado = await this.productosService.actualizarGarantia(
      normalizarIdProducto(id),
      dto,
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_REQUEST);
    }
    return resultado;
  }

  /** La imagen llega como data URL: el backend la sube a Cloudinary y Shopify la descarga desde ahí. */
  @Post(':id/imagenes')
  async agregarImagen(@Param('id') id: string, @Body() dto: AgregarImagenDto) {
    const resultado = await this.productosService.agregarImagen(
      normalizarIdProducto(id),
      dto,
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_REQUEST);
    }
    return resultado;
  }

  /**
   * Manda el orden completo de las imágenes; la primera queda como portada. El
   * servicio lo traduce a posiciones del media del producto, que es lo que
   * Shopify reordena.
   */
  @Patch(':id/imagenes/orden')
  async reordenarImagenes(
    @Param('id') id: string,
    @Body() dto: ReordenarImagenesDto,
  ) {
    const resultado = await this.productosService.reordenarImagenes(
      normalizarIdProducto(id),
      dto,
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_REQUEST);
    }
    return resultado;
  }

  /** Irreversible en Shopify: el frontend pide confirmación antes de llamar. */
  @Delete(':id/imagenes/:idImagen')
  async eliminarImagen(
    @Param('id') id: string,
    @Param('idImagen') idImagen: string,
  ) {
    const resultado = await this.productosService.eliminarImagen(
      normalizarIdProducto(id),
      { id: idImagen },
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_REQUEST);
    }
    return resultado;
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    const resultado = await this.productosService.eliminar(
      normalizarIdProducto(id),
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.mensaje, HttpStatus.BAD_REQUEST);
    }
    return { ok: true, mensaje: resultado.mensaje };
  }

  private async asegurarCatalogo(): Promise<void> {
    try {
      await this.productosService.asegurarCatalogo();
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Error desconocido.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
