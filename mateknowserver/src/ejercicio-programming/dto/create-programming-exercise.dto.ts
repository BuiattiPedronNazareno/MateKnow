// create-programming-exercise.dto.ts

import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
  IsBoolean,
} from 'class-validator';

export class ProgrammingTestCaseInput {
  @IsString({ message: 'stdin debe ser una cadena' })
  @IsOptional()
  stdin?: string;

  @IsString({ message: 'expected debe ser una cadena' })
  @IsNotEmpty({ message: 'La salida esperada es obligatoria' })
  expected!: string;

  @IsNumber({}, { message: 'weight debe ser un número' })
  @Min(0, { message: 'weight no puede ser negativo' })
  @IsOptional()
  weight?: number;

  @IsNumber({}, { message: 'timeout_seconds debe ser un número' })
  @Min(1, { message: 'timeout_seconds debe ser al menos 1' })
  @IsOptional()
  timeout_seconds?: number;

  @IsBoolean()
  @IsOptional()
  public?: boolean;
}

export class ProgrammingMetadata {
  @IsString({ message: 'El lenguaje debe ser una cadena' })
  @IsNotEmpty({ message: 'El lenguaje es obligatorio' })
  lenguaje!: string;

  @IsString({ message: 'El boilerplate debe ser una cadena' })
  @IsOptional()
  boilerplate?: string;
}

export class CreateProgrammingExerciseDto {
  @IsUUID('4', { message: 'tipoId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El tipo de ejercicio es obligatorio' })
  tipoId!: string;

  @IsString({ message: 'El enunciado debe ser una cadena' })
  @IsNotEmpty({ message: 'El enunciado es obligatorio' })
  enunciado!: string;

  @IsNumber({}, { message: 'puntos debe ser un número' })
  @Min(0, { message: 'puntos no puede ser negativo' })
  @IsOptional()
  puntos?: number;

  @ValidateNested()
  @Type(() => ProgrammingMetadata)
  metadata!: ProgrammingMetadata;

  @IsArray({ message: 'tests debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => ProgrammingTestCaseInput)
  @ArrayMinSize(1, { message: 'Debe haber al menos un caso de prueba' })
  tests!: ProgrammingTestCaseInput[];
}
