import { IsString, Matches, MaxLength } from 'class-validator';

export class SubirImagenDto {
  @IsString({ message: 'La imagen debe ser un texto.' })
  @Matches(/^data:image\/.*;base64,/, {
    message: 'La imagen debe enviarse como data URL (base64).',
  })
  @MaxLength(3_000_000, { message: 'La imagen es demasiado grande.' })
  imagen: string;
}
