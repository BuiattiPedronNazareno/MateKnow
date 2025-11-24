import { Type } from 'class-transformer';
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class UpdateProgrammingTestCaseDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsOptional()
  @IsString()
  stdin?: string | null;

  @IsOptional()
  @IsString()
  expected?: string | null;

  @IsOptional()
  @IsNumber()
  weight?: number;
}

export class UpdateProgrammingExerciseDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  enunciado!: string;

  @IsOptional()
  @IsNumber()
  puntos?: number;

  @IsOptional()
  metadata?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProgrammingTestCaseDto)
  tests!: UpdateProgrammingTestCaseDto[];
}
