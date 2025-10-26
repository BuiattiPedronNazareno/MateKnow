import { IsNotEmpty, IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateClaseDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  nombre?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'La descripción no puede superar los 500 caracteres' })
  descripcion?: string;

  @IsBoolean({ message: 'isPublico debe ser un valor booleano' })
  @IsOptional()
  isPublico?: boolean;
}