import { IsNotEmpty, IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { Quarter } from '../../common/enums';

export class GenerateReportDto {
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

  @IsOptional()
  @IsString()
  participationSummary?: string;

  @IsOptional()
  @IsString()
  overallPerformance?: string;
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
