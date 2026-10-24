import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import {
  EstadoConversacion,
  EtapaConversacion,
  ModoConversacion,
} from '../../entity/whatsapp.enums';

export class ActualizarConversacionDto {
  @IsOptional()
  @IsEnum(EstadoConversacion, {
    message: 'El estado de la conversación no es válido.',
  })
  estado?: EstadoConversacion;

  @IsOptional()
  @IsEnum(ModoConversacion, {
    message: 'El modo de la conversación no es válido.',
  })
  modo?: ModoConversacion;

  @IsOptional()
  @IsEnum(EtapaConversacion, {
    message: 'La etapa de la conversación no es válida.',
  })
  etapa?: EtapaConversacion;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El responsable debe ser un número entero.' })
  @Min(1, { message: 'El responsable debe ser mayor que cero.' })
  asignado_a?: number | null;
}
