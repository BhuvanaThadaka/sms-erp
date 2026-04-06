import {
  IsNotEmpty, IsOptional, IsString, IsMongoId, IsNumber, Min, Max,
} from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectTeacher: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  passingMarks?: number;
}

export class UpdateSubjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectTeacher: string;

  @IsOptional()
  @IsNumber()
  maxMarks?: number;

  @IsOptional()
  @IsNumber()
  passingMarks?: number;
}
