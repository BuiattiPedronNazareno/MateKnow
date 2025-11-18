import { IsOptional, IsString, IsBoolean, IsISO8601, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateActividadDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

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
}
