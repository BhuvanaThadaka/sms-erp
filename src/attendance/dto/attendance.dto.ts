import {
  IsEnum, IsNotEmpty, IsOptional, IsString, IsMongoId,
  IsDateString, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../../common/enums';

export class MarkAttendanceDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkAttendanceItemDto {
  @IsMongoId()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkMarkAttendanceDto {
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceItemDto)
  records: BulkAttendanceItemDto[];
}

export class AttendanceFilterDto {
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  month?: string; // format: YYYY-MM

  @IsOptional()
  @IsString()
  academicYear?: string;
}
