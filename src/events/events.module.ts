import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event, EventSchema } from './schemas/event.schema';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Class, ClassSchema } from '../classes/schemas/class.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
      { name: Class.name, schema: ClassSchema },
    ]),
    AuditLogsModule,
    WebsocketsModule,
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
