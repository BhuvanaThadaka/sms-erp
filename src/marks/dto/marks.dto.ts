import {
  IsEnum, IsNotEmpty, IsOptional, IsString, IsMongoId,
  IsNumber, Min, Max, IsBoolean, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Quarter } from '../../common/enums';

export class EnterMarksDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsOptional()
  @IsEnum(Quarter)
  quarter?: Quarter;

  @IsOptional()
  @IsString()
  termName?: string;

  @IsOptional()
  @IsString()
  examCode?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  marksObtained: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  maxMarks: number;

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsOptional()
  @IsString()
  teacherRemarks?: string;

  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean;
}

export class BulkMarksItemDto {
  @IsMongoId()
  studentId: string;

  @IsNumber()
  @Min(0)
  marksObtained: number;

  @IsOptional()
  @IsString()
  teacherRemarks?: string;

  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean;
}

export class BulkEnterMarksDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsOptional()
  @IsEnum(Quarter)
  quarter?: Quarter;

  @IsOptional()
  @IsString()
  termName?: string;

  @IsOptional()
  @IsString()
  examCode?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  maxMarks: number;

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMarksItemDto)
  records: BulkMarksItemDto[];
}

export class UpdateMarksDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  marksObtained?: number;

  @IsOptional()
  @IsString()
  teacherRemarks?: string;

  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean;
}

export class MarksFilterDto {
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @IsOptional()
  @IsEnum(Quarter)
  quarter?: Quarter;

  @IsOptional()
  @IsString()
  termName?: string;

  @IsOptional()
  @IsString()
  examCode?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;
}
