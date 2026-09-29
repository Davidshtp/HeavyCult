import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopifyModule } from '../shopify/shopify.module';
import { Integracion } from './entity/integracion.entity';
import { IntegracionController } from './integracion.controller';
import { IntegracionService } from './integracion.service';

@Module({
  imports: [TypeOrmModule.forFeature([Integracion]), ShopifyModule],
  controllers: [IntegracionController],
  providers: [IntegracionService],
})
export class IntegracionModule {}
