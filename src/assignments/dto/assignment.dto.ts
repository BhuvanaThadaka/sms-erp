import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsMongoId } from 'class-validator';
import { AssignmentStatus, SubmissionStatus } from '../../common/enums';

export class CreateAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsMongoId()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;
}

export class CreateSubmissionDto {
  @IsMongoId()
  @IsNotEmpty()
  assignmentId: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;
}

export class ReviewSubmissionDto {
  @IsEnum(SubmissionStatus)
  @IsNotEmpty()
  status: SubmissionStatus;

  @IsString()
  @IsOptional()
  remarks?: string;
}
