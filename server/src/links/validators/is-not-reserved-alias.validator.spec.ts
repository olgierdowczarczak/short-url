import { validateSync } from 'class-validator';
import { IsNotReservedAlias } from './is-not-reserved-alias.validator.js';

class TestDto {
  @IsNotReservedAlias()
  alias: unknown;
}

const validateAlias = (alias: unknown) => {
  const dto = new TestDto();
  dto.alias = alias;
  return validateSync(dto);
};

describe('IsNotReservedAlias', () => {
  it.each(['api', 'docs', 'health', 'HEALTH', 'Api'])(
    'alias should not pass using %s',
    (alias) => {
      const errors = validateAlias(alias);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({
        isNotReservedAlias: 'alias must not be reserved',
      });
    },
  );

  it.each(['my-alias', 'apis', 123])('alias should pass using %s', (alias) => {
    const errors = validateAlias(alias);

    expect(errors).toHaveLength(0);
  });
});
