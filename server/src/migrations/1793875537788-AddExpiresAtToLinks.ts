import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiresAtToLinks1793875537788 implements MigrationInterface {
  name = 'AddExpiresAtToLinks1793875537788';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "links" ADD "expires_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "links" DROP COLUMN "expires_at"`);
  }
}
