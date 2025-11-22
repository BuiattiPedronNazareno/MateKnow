import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateTestCaseDto {
  @IsUUID()
  @IsNotEmpty()
  ejercicioId!: string;

  @IsOptional()
  @IsString()
  stdin?: string | null;

  @IsOptional()
  @IsString()
  expected?: string | null;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  timeoutSeconds?: number;

  @IsOptional()
  @IsBoolean()
  public?: boolean;
}
