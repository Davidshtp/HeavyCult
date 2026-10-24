import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListarMensajesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El cursor debe ser un número entero.' })
  @Min(1, { message: 'El cursor debe ser mayor que cero.' })
  antes_de?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser al menos 1.' })
  @Max(100, { message: 'El límite no puede superar 100.' })
  limite?: number;
}
