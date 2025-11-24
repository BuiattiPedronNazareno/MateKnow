import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsISO8601, IsNumber, IsUUID, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import { ProgrammingTestCaseInput, ProgrammingMetadata } from '../../ejercicio-programming/dto/create-programming-exercise.dto';

export class CreateEjercicioDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  enunciado?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProgrammingMetadata)
  metadata?: ProgrammingMetadata | any;

  @IsOptional()
  @IsNumber()
  puntos?: number;

  @IsOptional()
  @IsString()
  tipo?: 'multiple-choice' | 'abierta' | 'verdadero-falso' | 'programming';

  @IsOptional()
  opciones?: { texto: string; is_correcta?: boolean }[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe haber al menos un caso de prueba para ejercicios de programación' })
  @ValidateNested({ each: true })
  @Type(() => ProgrammingTestCaseInput)
  tests?: ProgrammingTestCaseInput[];
}

export class CreateActividadDto {
  @IsString()
  nombre: string;

  @IsString()
  descripcion: string;

  @IsOptional()
  @IsString()
  tipo?: 'evaluacion' | 'practica';

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value !== 'string') return value;
    const v = value.trim();
    if (v === '') return undefined;
    // Si ya es un string ISO con Z o offset, mantenerlo
    if (v.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(v)) return v;
    const parsed = new Date(v);
    if (isNaN(parsed.getTime())) return v; // dejar que el validador maneje el error
    return parsed.toISOString();
  })
  @IsISO8601()
  fechaInicio?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value !== 'string') return value;
    const v = value.trim();
    if (v === '') return undefined;
    if (v.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(v)) return v;
    const parsed = new Date(v);
    if (isNaN(parsed.getTime())) return v;
    return parsed.toISOString();
  })
  @IsISO8601()
  fechaFin?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsArray()
  ejercicioIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEjercicioDto)
  nuevosEjercicios?: CreateEjercicioDto[];
}