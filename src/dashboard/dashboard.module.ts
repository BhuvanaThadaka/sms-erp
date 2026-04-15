import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Class, ClassSchema } from '../classes/schemas/class.schema';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { Report, ReportSchema } from '../reports/schemas/report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
