import { IsNotEmpty, IsOptional, IsString, IsNumber, IsMongoId, IsDateString, IsArray } from 'class-validator';

export class CreateSessionDto {
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsNotEmpty()
  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  sessionDate: string;

  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsOptional()
  @IsArray()
  materials?: string[];

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsOptional()
  @IsArray()
  learningObjectives?: string[];
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsArray()
  materials?: string[];
}
