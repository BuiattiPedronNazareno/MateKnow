import { Type } from 'class-transformer';
import { 
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class ProgrammingTestCaseInput {
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

export class CreateProgrammingExerciseDto {

  @IsUUID()
  @IsNotEmpty()
  tipoId!: string;

  @IsString()
  @IsNotEmpty()
  enunciado!: string;

  @IsNumber()
  @IsOptional()
  puntos?: number;

  @IsOptional()
  metadata?: any;

  @IsNotEmpty()
  @IsString()
  nombre!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgrammingTestCaseInput)
  tests!: ProgrammingTestCaseInput[];
}
