import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EstadoConversacion,
  EtapaConversacion,
  ModoConversacion,
} from '../../entity/whatsapp.enums';

const aBooleano = ({ value }: { value: unknown }): boolean =>
  value === true || value === 'true' || value === '1';

const limpiar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ListarConversacionesDto {
  @IsOptional()
  @IsEnum(EstadoConversacion, {
    message: 'El estado de la conversación no es válido.',
  })
  estado?: EstadoConversacion;

  @IsOptional()
  @IsEnum(EtapaConversacion, {
    message: 'La etapa de la conversación no es válida.',
  })
  etapa?: EtapaConversacion;

  @IsOptional()
  @IsEnum(ModoConversacion, {
    message: 'El modo de la conversación no es válido.',
  })
  modo?: ModoConversacion;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La instancia debe ser un número entero.' })
  @Min(1, { message: 'La instancia debe ser mayor que cero.' })
  id_instancia?: number;

  @IsOptional()
  @Transform(aBooleano)
  solo_no_leidos?: boolean;

  @IsOptional()
  @Transform(limpiar)
  @IsString({ message: 'La búsqueda debe ser un texto.' })
  @MaxLength(120, { message: 'La búsqueda no puede superar 120 caracteres.' })
  buscar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página debe ser mayor que cero.' })
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El tamaño de página debe ser un número entero.' })
  @Min(1, { message: 'El tamaño de página debe ser al menos 1.' })
  @Max(50, { message: 'El tamaño de página no puede superar 50.' })
  por_pagina?: number;
}
