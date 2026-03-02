import { IsNotEmpty, IsOptional, IsString, IsMongoId, IsEnum, IsDateString } from 'class-validator';
import { DayOfWeek } from '../schemas/schedule.schema';

export class CreateScheduleDto {
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsNotEmpty()
  @IsMongoId()
  teacher: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsNotEmpty()
  @IsString()
  startTime: string;

  @IsNotEmpty()
  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string;
}

export class RescheduleDto {
  @IsNotEmpty()
  @IsDateString()
  rescheduledDate: string;

  @IsNotEmpty()
  @IsString()
  rescheduleReason: string;
}
