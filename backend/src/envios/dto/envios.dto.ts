import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Código DANE de departamento: dos dígitos. */
const CODIGO_DEPARTAMENTO = /^\d{2}$/;

export class ListarMunicipiosDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  @Matches(CODIGO_DEPARTAMENTO, {
    message: 'departamento_id debe ser el código DANE de dos dígitos.',
  })
  departamento_id!: string;
}
