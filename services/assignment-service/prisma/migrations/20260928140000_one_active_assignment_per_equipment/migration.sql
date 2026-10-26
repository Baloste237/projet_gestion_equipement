-- Un équipement ne peut avoir qu'une seule affectation ACTIVE, y compris en cas de demandes simultanées.
-- Index partiel : Prisma ne sait pas l'exprimer dans schema.prisma, il n'existe donc que dans cette migration.

-- Refuse la migration si des équipements ont déjà plusieurs affectations actives (à corriger avant de relancer)
DO $$
DECLARE
  duplicated text;
BEGIN
  SELECT string_agg("equipmentId", ', ') INTO duplicated
  FROM (
    SELECT "equipmentId"
    FROM "Assignment"
    WHERE "status" = 'ACTIVE'
    GROUP BY "equipmentId"
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicated IS NOT NULL THEN
    RAISE EXCEPTION 'Migration impossible : plusieurs affectations actives pour les équipements : %', duplicated;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_equipmentId_active_key" ON "Assignment"("equipmentId") WHERE "status" = 'ACTIVE';
