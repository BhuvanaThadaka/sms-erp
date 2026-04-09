import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class ExamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsOptional()
  maxMarks?: number;

  @IsNumber()
  @IsOptional()
  weightage?: number;
}

class TermDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamDto)
  exams: ExamDto[];
}

export class CreateAcademicStructureDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermDto)
  terms: TermDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAcademicStructureDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermDto)
  @IsOptional()
  terms?: TermDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
