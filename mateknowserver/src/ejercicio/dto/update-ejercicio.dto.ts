import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  Min,
} from '@nestjs/class-validator';

import { Type } from '@nestjs/class-transformer';

class OpcionDto {
  @IsString({ message: 'El texto de la opción debe ser una cadena' })
  @IsNotEmpty({ message: 'El texto de la opción es obligatorio' })
  texto: string;

  @IsBoolean({ message: 'isCorrecta debe ser un booleano' })
  isCorrecta: boolean;
}

export class UpdateEjercicioDto {
  @IsString({ message: 'El enunciado debe ser una cadena de texto' })
  @IsOptional()
  enunciado?: string;

  @IsNumber({}, { message: 'Los puntos deben ser un número' })
  @Min(0, { message: 'Los puntos no pueden ser negativos' })
  @IsOptional()
  puntos?: number;

  @IsBoolean({ message: 'isVersus debe ser un booleano' })
  @IsOptional()
  isVersus?: boolean;

  @IsArray({ message: 'Las opciones deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => OpcionDto)
  @ArrayMinSize(2, { message: 'Debe haber al menos 2 opciones' })
  @IsOptional()
  opciones?: OpcionDto[];
}