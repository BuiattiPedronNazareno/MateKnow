import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAnuncioDto {
  @IsString({ message: 'El título debe ser un texto' })
  @IsOptional()
  @MaxLength(200, { message: 'El título no puede tener más de 200 caracteres' })
  titulo?: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  descripcion?: string;
}