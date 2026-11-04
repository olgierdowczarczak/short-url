import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClicksToLinks1793816467280 implements MigrationInterface {
  name = 'AddClicksToLinks1793816467280';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "links" ADD "clicks" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "links" DROP COLUMN "clicks"`);
  }
}
