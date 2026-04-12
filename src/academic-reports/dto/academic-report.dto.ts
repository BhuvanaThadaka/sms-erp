import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Quarter } from '../../common/enums';

export class GenerateAcademicReportDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsOptional()
  quarter?: Quarter;

  @IsOptional()
  @IsString()
  termName?: string;

  @IsOptional()
  @IsString()
  examCode?: string;

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

  @IsOptional()
  quarter?: Quarter;

  @IsOptional()
  @IsString()
  termName?: string;

  @IsOptional()
  @IsString()
  examCode?: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string;
}
