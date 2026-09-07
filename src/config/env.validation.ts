import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsHexadecimal,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ISSUER!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_TTL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TOKEN_TTL!: string;

  @IsString()
  @IsNotEmpty()
  @IsHexadecimal()
  @Length(64, 64)
  AUTHCORE_KEY_ENCRYPTION_KEY!: string;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('; '),
    );
  }

  return validated;
}
