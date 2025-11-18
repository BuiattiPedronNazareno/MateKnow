import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsISO8601, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';

export class CreateEjercicioDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  enunciado?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @IsNumber()
  puntos?: number;

  @IsOptional()
  @IsString()
  tipo?: 'multiple-choice' | 'abierta' | 'verdadero-falso';

  @IsOptional()
  opciones?: { texto: string; is_correcta?: boolean }[];
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
    // If already an ISO string with Z or offset, keep it
    if (v.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(v)) return v;
    const parsed = new Date(v);
    if (isNaN(parsed.getTime())) return v; // let validator handle the error
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

  @IsBoolean()
  isVisible: boolean;

  @IsOptional()
  @IsArray()
  ejercicioIds?: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateEjercicioDto)
  nuevosEjercicios?: CreateEjercicioDto[];
}
