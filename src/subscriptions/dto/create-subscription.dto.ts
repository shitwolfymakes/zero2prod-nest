import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * The `POST /subscriptions` payload.
 *
 * The global `ValidationPipe` rejects anything that fails these rules with a
 * `400 Bad Request` before the controller ever runs.
 */
export class CreateSubscriptionDto {
  @IsEmail()
  @MaxLength(256)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  name!: string;
}
