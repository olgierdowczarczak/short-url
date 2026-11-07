import { registerDecorator, type ValidationOptions } from 'class-validator';

const RESERVED_ALIASES = new Set([
  'api',
  'docs',
  'docs-json',
  'docs-yaml',
  'health',
]);

export function IsNotReservedAlias(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isNotReservedAlias',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return true;
          }
          return !RESERVED_ALIASES.has(value.toLowerCase());
        },
        defaultMessage() {
          return `${propertyName} must not be reserved`;
        },
      },
    });
  };
}
