import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    @InjectPinoLogger(SubscriptionsController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Body() dto: CreateSubscriptionDto): Promise<void> {
    // Attach the subscriber to every log line for the rest of this request.
    this.logger.assign({ subscriber_email: dto.email });
    this.logger.info('Adding a new subscriber');
    await this.subscriptions.create(dto);
  }
}
