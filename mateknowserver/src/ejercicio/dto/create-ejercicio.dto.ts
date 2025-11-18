import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOpcionEjercicioDto {
  @IsString({ message: 'El texto de la opción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El texto de la opción no puede estar vacío' })
  texto: string;

  @IsBoolean({ message: 'isCorrecta debe ser un booleano' })
  isCorrecta: boolean;
}

export class CreateEjercicioDto {
  @IsString({ message: 'El enunciado debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El enunciado no puede estar vacío' })
  enunciado: string;

  @IsUUID('4', {
    message: 'El ID del tipo de ejercicio debe ser un UUID válido',
  })
  @IsNotEmpty({
    message: 'El ID del tipo de ejercicio es obligatorio',
  })
  tipoId: string;

  @IsNumber({}, { message: 'Los puntos deben ser un número' })
  @Min(0, { message: 'Los puntos no pueden ser negativos' })
  @IsOptional()
  puntos?: number = 1;

  @IsBoolean({ message: 'isVersus debe ser un booleano' })
  @IsOptional()
  isVersus?: boolean = false;

  @ValidateNested({ each: true })
  @Type(() => CreateOpcionEjercicioDto)
  @ArrayMinSize(1, { message: 'Debe haber al menos una opción de respuesta' })
  @IsArray({ message: 'Las opciones deben ser un array' })
  opciones: CreateOpcionEjercicioDto[];
}
