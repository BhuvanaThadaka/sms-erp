import { Controller, Get, Post, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { AcademicReportsService } from './academic-reports.service';
import { GenerateAcademicReportDto, BulkGenerateReportDto } from './dto/academic-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public, CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('academic-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicReportsController {
  constructor(private readonly academicReportsService: AcademicReportsService) {}

  @Post('generate')
  @Roles(Role.ADMIN, Role.TEACHER)
  generate(@Body() dto: GenerateAcademicReportDto, @CurrentUser('userId') userId: string) {
    return this.academicReportsService.generate(dto, userId);
  }

  @Post('bulk-generate')
  @Roles(Role.ADMIN, Role.TEACHER)
  bulkGenerate(@Body() dto: BulkGenerateReportDto, @CurrentUser('userId') userId: string) {
    return this.academicReportsService.bulkGenerate(dto, userId);
  }

  @Public()
  @Get(':id/pdf')
  async generatePdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.academicReportsService.generatePdf(id);
    this.sendPdfResponse(res, buffer, id);
  }

  @Public()
  @Get(':studentId/:quarter/:academicYear/pdf')
  async generatePdfLegacy(
    @Param('studentId') studentId: string,
    @Param('quarter') quarter: string,
    @Param('academicYear') academicYear: string,
    @Res() res: Response,
  ) {
    const report = await this.academicReportsService.findByComposite(studentId, quarter, academicYear);
    const buffer = await this.academicReportsService.generatePdf(report._id.toString());
    this.sendPdfResponse(res, buffer, report._id.toString());
  }

  private sendPdfResponse(res: Response, buffer: Buffer, id: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=report-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get()
  findAll(
    @Query('classId') classId: string,
    @Query('studentId') studentId: string,
    @Query('quarter') quarter: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ) {
    return this.academicReportsService.findAll({
      classId, studentId, quarter, academicYear,
      requestingUser: { userId: user.userId, role: user.role },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.academicReportsService.findById(id);
  }
}
