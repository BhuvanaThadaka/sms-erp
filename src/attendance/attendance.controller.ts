import { Controller, Get, Post, Body, Query, UseGuards, Param, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto, BulkMarkAttendanceDto, AttendanceFilterDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  @Roles(Role.ADMIN, Role.TEACHER)
  async mark(@Body() dto: MarkAttendanceDto, @CurrentUser('userId') userId: string) {
    return this.attendanceService.markAttendance(dto, userId);
  }

  @Post('bulk-mark')
  @Roles(Role.ADMIN, Role.TEACHER)
  async bulkMark(@Body() dto: BulkMarkAttendanceDto, @CurrentUser('userId') userId: string) {
    return this.attendanceService.bulkMarkAttendance(dto, userId);
  }

  @Get()
  async getAttendance(@Query() filter: AttendanceFilterDto, @CurrentUser() user: any) {
    if (user.role === Role.STUDENT) {
      filter.studentId = user.userId;
    }
    return this.attendanceService.getAttendance(filter);
  }

  @Get('student/:studentId/summary')
  async getStudentSummary(
    @Param('studentId') studentId: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ) {
    if (user.role === Role.STUDENT && user.userId !== studentId) {
      throw new ForbiddenException('You can only view your own attendance');
    }
    return this.attendanceService.getStudentAttendanceSummary(studentId, academicYear);
  }

  @Get('class/:classId/stats')
  @Roles(Role.ADMIN, Role.TEACHER)
  async getClassStats(@Param('classId') classId: string, @Query('date') date: string) {
    return this.attendanceService.getClassAttendanceStats(classId, date);
  }
}
