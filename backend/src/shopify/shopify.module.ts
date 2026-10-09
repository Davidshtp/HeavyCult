import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Integracion } from '../integracion/entity/integracion.entity';
import { ShopifyPedidosController } from './pedidos/pedidos.controller';
import { ShopifyPedidosService } from './pedidos/pedidos.service';
import { ShopifyProductosCatalogoService } from './productos/productos.catalogo.service';
import { ShopifyProductosController } from './productos/productos.controller';
import { ShopifyProductosImagenesService } from './productos/productos.imagenes.service';
import { ShopifyProductosService } from './productos/productos.service';
import { ShopifyAuthService } from './core/shopify-auth.service';
import { ShopifyCredentialsService } from './core/shopify-credentials.service';
import { ShopifyGraphqlService } from './core/shopify-graphql.service';
import { ShopifyTokenService } from './core/shopify-token.service';
import { ShopifyTiendaController } from './tienda/tienda.controller';
import { ShopifyTiendaService } from './tienda/tienda.service';

/**
 * Módulo Shopify dividido por dominio:
 *  - `core/` servicios base (auth, token, credenciales, GraphQL)
 *  - `tienda/` conexión y prueba de la tienda
 *  - `pedidos/` alta de pedidos
 *  - `productos/` catálogo, galería y escrituras de producto
 *  - `common/` helpers compartidos
 */
@Module({
  // Cloudinary entra porque las imágenes de producto se suben ahí antes de
  // pasarle la URL a Shopify.
  imports: [TypeOrmModule.forFeature([Integracion]), CloudinaryModule],
  controllers: [
    ShopifyTiendaController,
    ShopifyPedidosController,
    ShopifyProductosController,
  ],
  providers: [
    ShopifyAuthService,
    ShopifyTiendaService,
    ShopifyPedidosService,
    ShopifyTokenService,
    ShopifyGraphqlService,
    ShopifyCredentialsService,
    ShopifyProductosCatalogoService,
    ShopifyProductosImagenesService,
    ShopifyProductosService,
  ],
  exports: [ShopifyTokenService, ShopifyCredentialsService],
})
export class ShopifyModule {}
