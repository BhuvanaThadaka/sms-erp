import {
  IsNotEmpty, IsOptional, IsString, IsEnum, IsDateString,
  IsArray, IsBoolean, IsMongoId,
} from 'class-validator';
import { EventType } from '../../common/enums';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(EventType)
  type: EventType;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableClasses?: string[];

  @IsOptional()
  @IsBoolean()
  isAllClasses?: boolean;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string;
}
