import { IsNotEmpty, IsOptional, IsString, IsNumber, IsMongoId } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  grade: string;

  @IsNotEmpty()
  @IsString()
  section: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string;

  @IsOptional()
  @IsMongoId()
  classTeacher?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsNumber()
  maxStudents?: number;

  @IsOptional()
  @IsMongoId()
  academicStructure?: string;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsMongoId()
  classTeacher?: string;

  @IsOptional()
  @IsNumber()
  maxStudents?: number;

  @IsOptional()
  @IsMongoId()
  academicStructure?: string;
}

export class AssignTeacherDto {
  @IsNotEmpty()
  @IsMongoId()
  teacherId: string;
}
