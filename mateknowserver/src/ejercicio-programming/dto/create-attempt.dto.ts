import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateAttemptDto {
  @IsUUID()
  @IsNotEmpty()
  ejercicioId!: string;

  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  lenguaje!: string;

  @IsOptional()
  @IsString()
  version?: string | null;

  @IsOptional()
  @IsBoolean()
  runOnly?: boolean;
}
