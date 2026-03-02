import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Quarter } from '../../common/enums';

export class GenerateAcademicReportDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsNotEmpty()
  @IsEnum(Quarter)
  quarter: Quarter;

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsOptional()
  @IsString()
  teacherRemarks?: string;
}

export class BulkGenerateReportDto {
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsNotEmpty()
  @IsEnum(Quarter)
  quarter: Quarter;

  @IsNotEmpty()
  @IsString()
  academicYear: string;
}
