import {
  Controller, Get, Post, Body, Patch, Param, Query, UseGuards,
} from '@nestjs/common';
import { MarksService } from './marks.service';
import { EnterMarksDto, BulkEnterMarksDto, UpdateMarksDto, MarksFilterDto } from './dto/marks.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role, Quarter } from '../common/enums';

@Controller('marks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarksController {
  constructor(private readonly marksService: MarksService) {}

  // Subject Teacher or Admin enters marks
  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  enterMarks(@Body() dto: EnterMarksDto, @CurrentUser() user: any) {
    return this.marksService.enterMarks(dto, user.userId, user.role);
  }

  // Bulk entry for entire class
  @Post('bulk')
  @Roles(Role.ADMIN, Role.TEACHER)
  bulkEnterMarks(@Body() dto: BulkEnterMarksDto, @CurrentUser() user: any) {
    return this.marksService.bulkEnterMarks(dto, user.userId, user.role);
  }

  // Get marks with filters
  @Get()
  getMarks(@Query() filter: MarksFilterDto, @CurrentUser() user: any) {
    return this.marksService.getMarks(filter, { userId: user.userId, role: user.role });
  }

  // Student report card (subject-wise breakdown)
  @Get('student/:studentId/report-card')
  getStudentReportCard(
    @Param('studentId') studentId: string,
    @Query('academicYear') academicYear: string,
    @Query('classId') classId: string,
    @CurrentUser() user: any,
  ) {
    // Students can only see their own
    const targetId = user.role === Role.STUDENT ? user.userId : studentId;
    return this.marksService.getStudentReportCard(targetId, academicYear, classId);
  }

  // Class teacher sees all students in their class
  @Get('class/:classId/performance')
  @Roles(Role.ADMIN, Role.TEACHER)
  getClassPerformance(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear: string,
    @Query('quarter') quarter: Quarter,
  ) {
    return this.marksService.getClassPerformance(classId, academicYear, quarter);
  }

  // Update existing mark
  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(@Param('id') id: string, @Body() dto: UpdateMarksDto, @CurrentUser() user: any) {
    return this.marksService.update(id, dto, user.userId, user.role);
  }
}
