import { IsOptional, IsString, IsBoolean, IsISO8601, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateEjercicioDto } from './create-actividad.dto';

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
    return new Date(value).toISOString();
  })
  @IsISO8601()
  fechaInicio?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value !== 'string') return value;
    return new Date(value).toISOString();
  })
  @IsISO8601()
  fechaFin?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  // CORRECCIÓN: Quitamos @IsUUID para evitar conflictos, solo validamos que sea Array
  @IsOptional()
  @IsArray()
  ejercicioIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEjercicioDto)
  nuevosEjercicios?: CreateEjercicioDto[];
}