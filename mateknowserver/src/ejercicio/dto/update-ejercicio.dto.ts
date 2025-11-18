import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateOpcionDto {
  @IsString({ message: 'El texto de la opción debe ser una cadena' })
  @IsNotEmpty({ message: 'El texto de la opción no puede estar vacío' })
  @IsOptional()
  texto?: string;

  @IsBoolean({ message: 'isCorrecta debe ser un booleano' })
  @IsOptional()
  isCorrecta?: boolean;
}

export class UpdateEjercicioDto {
  @IsString({ message: 'El enunciado debe ser una cadena' })
  @IsOptional()
  enunciado?: string;

  @IsUUID('4', {
    message: 'El ID del tipo de ejercicio debe ser un UUID válido',
  })
  @IsOptional()
  tipoId?: string;

  @IsNumber({}, { message: 'Los puntos deben ser un número' })
  @Min(0, { message: 'Los puntos no pueden ser negativos' })
  @IsOptional()
  puntos?: number;

  @IsBoolean({ message: 'isVersus debe ser un booleano' })
  @IsOptional()
  isVersus?: boolean;

  @IsArray({ message: 'Las opciones deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => UpdateOpcionDto)
  @IsOptional()
  opciones?: UpdateOpcionDto[];
}
