-- authUserId devient optionnel : une fiche peut exister avant que la personne ait un compte.
-- L unicite est conservee (PostgreSQL autorise plusieurs NULL).
ALTER TABLE "User" ALTER COLUMN "authUserId" DROP NOT NULL;
