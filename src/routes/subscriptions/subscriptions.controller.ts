//! src/routes/subscriptions/subscriptions.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { FormDataDto } from './dto/form-data.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    @InjectPinoLogger(SubscriptionsController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post()
  @HttpCode(200)
  async subscribe(@Body() form: FormDataDto): Promise<void> {
    // Attach the subscriber's details to every log line emitted for the rest
    // of this request, the way `#[tracing::instrument(fields(...))]` attaches
    // them to the span in the Rust project.
    this.logger.assign({
      subscriber_email: form.email,
      subscriber_name: form.name,
    });
    this.logger.info('Adding a new subscriber');

    try {
      await this.subscriptions.insertSubscriber(form);
    } catch {
      // The service has already logged the underlying failure; the caller
      // just gets an opaque 500.
      throw new InternalServerErrorException();
    }
  }
}
