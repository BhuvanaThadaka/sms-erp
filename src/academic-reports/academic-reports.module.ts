import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicReportsService } from './academic-reports.service';
import { AcademicReportsController } from './academic-reports.controller';
import { AcademicReport, AcademicReportSchema } from './schemas/academic-report.schema';
import { MarksModule } from '../marks/marks.module';
import { UsersModule } from '../users/users.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AcademicReport.name, schema: AcademicReportSchema }]),
    MarksModule,
    UsersModule,
    AttendanceModule,
    AuditLogsModule,
  ],
  controllers: [AcademicReportsController],
  providers: [AcademicReportsService],
  exports: [AcademicReportsService],
})
export class AcademicReportsModule {}
