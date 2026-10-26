import "dotenv/config";
import app from "./app";
import { assertSecurityConfig } from "./config/security-config";

// Refuse de démarrer sans secret : aucune valeur de repli
assertSecurityConfig("JWT_SECRET", "INTERNAL_SERVICE_TOKEN");

import { startAuditConsumer } from "./consumers/audit.consumer";

const PORT = process.env.PORT || 4006;

startAuditConsumer();

app.listen(PORT, () => {
  console.log(`audit-service running on port ${PORT}`);
});
// reload

