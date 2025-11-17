import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAnuncioDto {
  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(200, { message: 'El título no puede tener más de 200 caracteres' })
  titulo: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  descripcion: string;
}