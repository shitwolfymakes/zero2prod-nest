//! src/routes/subscriptions/dto/form-data.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * The `application/x-www-form-urlencoded` payload accepted by `POST
 * /subscriptions`.
 *
 * A missing or non-string field fails validation and the global
 * `ValidationPipe` turns that into a `400 Bad Request` — the same outcome
 * `actix-web` produces when it cannot deserialize the form into `FormData`.
 */
export class FormDataDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
