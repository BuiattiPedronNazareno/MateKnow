import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsUUID,
  IsOptional,
  ValidateNested,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SupportedLanguage {
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  CSHARP = 'csharp',
  PHP = 'php',
  RUBY = 'ruby',
  GO = 'go',
  RUST = 'rust',
  TYPESCRIPT = 'typescript',
}

export class TestCaseDto {
  @IsString({ message: 'stdin debe ser una cadena' })
  @IsOptional()
  stdin?: string;

  @IsString({ message: 'expected debe ser una cadena' })
  @IsNotEmpty({ message: 'expected es obligatorio' })
  expected: string;

  @IsNumber({}, { message: 'weight debe ser un número' })
  @Min(0, { message: 'weight no puede ser negativo' })
  @IsOptional()
  weight?: number;

  @IsNumber({}, { message: 'timeoutSeconds debe ser un número' })
  @Min(1, { message: 'timeoutSeconds debe ser al menos 1' })
  @IsOptional()
  timeoutSeconds?: number;

  @IsOptional()
  public?: boolean;
}

export class CreateProgrammingExerciseDto {
  @IsUUID('4', { message: 'tipoId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El tipo de ejercicio es obligatorio' })
  tipoId: string;

  @IsString({ message: 'El enunciado debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El enunciado es obligatorio' })
  enunciado: string;

  @IsNumber({}, { message: 'Los puntos deben ser un número' })
  @Min(0, { message: 'Los puntos no pueden ser negativos' })
  @IsOptional()
  puntos?: number;

  @IsEnum(SupportedLanguage, {
    message: 'Lenguaje no soportado',
  })
  @IsNotEmpty({ message: 'El lenguaje es obligatorio' })
  lenguaje: SupportedLanguage;

  @IsString({ message: 'El código inicial debe ser una cadena' })
  @IsOptional()
  boilerplate?: string;

  @IsString({ message: 'La descripción debe ser una cadena' })
  @IsOptional()
  descripcion?: string;

  @IsArray({ message: 'Los test cases deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  @IsOptional()
  testCases?: TestCaseDto[];
}