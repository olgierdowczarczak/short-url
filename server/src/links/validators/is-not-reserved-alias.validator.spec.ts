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
  it.each(['api', 'docs', 'docs-json', 'docs-yaml', 'health', 'HEALTH', 'Api'])(
    'should reject reserved alias "%s"',
    (alias) => {
      const errors = validateAlias(alias);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({
        isNotReservedAlias: 'alias must not be reserved',
      });
    },
  );

  it.each(['my-alias', 'apis'])('should accept alias "%s"', (alias) => {
    const errors = validateAlias(alias);

    expect(errors).toHaveLength(0);
  });

  it('should skip non-string values and leave type checks to other validators', () => {
    const errors = validateAlias(123);

    expect(errors).toHaveLength(0);
  });
});
