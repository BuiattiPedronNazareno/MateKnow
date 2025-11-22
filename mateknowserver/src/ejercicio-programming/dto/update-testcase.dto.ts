import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class UpdateTestCaseDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

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
