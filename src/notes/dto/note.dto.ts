import { IsNotEmpty, IsOptional, IsString, IsMongoId, IsNumber } from 'class-validator';

export class CreateNoteDto {
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  fileUrl: string;

  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsOptional()
  @IsMongoId()
  sessionId?: string;
}
