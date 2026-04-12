import {
  Controller, Get, Patch, Delete, Param, UseGuards, Post,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/public.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser('userId') userId: string) {
    console.log(`Fetching notifications for user: ${userId}`);
    const results = await this.notificationsService.findAllForUser(userId);
    console.log(`Found ${results.length} notifications`);
    return results;
  }

  @Get('all')
  async findAllNotifications(@CurrentUser('userId') userId: string) {
    console.log(`Fetching all notifications for user: ${userId}`);
    const results = await this.notificationsService.findAllNotificationsForUser(userId);
    console.log(`Found ${results.length} notifications`);
    return results;
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.notificationsService.delete(id, userId);
  }
}
