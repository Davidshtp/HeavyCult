import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integracion } from '../integracion/entity/integracion.entity';
import { ShopifyAuthService } from './shopify-auth.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { ShopifyTokenService } from './shopify-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([Integracion])],
  controllers: [ShopifyController],
  providers: [ShopifyAuthService, ShopifyService, ShopifyTokenService],
  exports: [ShopifyTokenService],
})
export class ShopifyModule {}
