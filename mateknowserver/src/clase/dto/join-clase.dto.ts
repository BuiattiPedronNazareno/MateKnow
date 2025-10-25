import { IsNotEmpty, IsString, Length } from 'class-validator';

export class JoinClaseDto {
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Length(8, 8, { message: 'El código debe tener exactamente 8 caracteres' })
  codigo: string;
}