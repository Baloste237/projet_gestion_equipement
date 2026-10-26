-- AlterTable : état de fonctionnement et dates de service (migration additive, sans reprise de données)
ALTER TABLE "Equipment" ADD COLUMN     "condition" TEXT NOT NULL DEFAULT 'FONCTIONNEL',
ADD COLUMN     "commissionedAt" TIMESTAMP(3),
ADD COLUMN     "decommissionedAt" TIMESTAMP(3);
