import "dotenv/config";
import app from "./app";
import { startAuditConsumer } from "./consumers/audit.consumer";

const PORT = process.env.PORT || 4006;

startAuditConsumer();

app.listen(PORT, () => {
  console.log(`audit-service running on port ${PORT}`);
});
// reload

