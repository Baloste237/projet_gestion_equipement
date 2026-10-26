import { Router } from "express";
import { credentialAdminController } from "../controllers/credential-admin.controller";
import { validate } from "../middlewares/validate";
import { updateCredentialSchema } from "../validators/credential-admin.validator";

// Routes réservées aux services (secret partagé, voir app.ts) : volontairement absentes du gateway
const router = Router();

router.get("/by-email/:email", credentialAdminController.getByEmail);
router.patch("/:id", validate(updateCredentialSchema), credentialAdminController.update);

export default router;
