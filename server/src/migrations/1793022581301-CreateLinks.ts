import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLinks1793022581301 implements MigrationInterface {
  name = 'CreateLinks1793022581301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "links" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "url" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_52a3fa2a2c27a987ed58fd2ea42" UNIQUE ("code"), CONSTRAINT "PK_ecf17f4a741d3c5ba0b4c5ab4b6" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "links"`);
  }
}
