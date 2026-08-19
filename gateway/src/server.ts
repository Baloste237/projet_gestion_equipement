import env from "./config/env";
import app from "./app";

app.listen(env.PORT, () => {
  console.log(`API Gateway running on port ${env.PORT}`);
  console.log(`Routing configured for microservices:`);
  console.log(`- Auth Service       : ${env.AUTH_SERVICE_URL}`);
  console.log(`- User Service       : ${env.USER_SERVICE_URL}`);
  console.log(`- Equipment Service  : ${env.EQUIPMENT_SERVICE_URL}`);
  console.log(`- Assignment Service : ${env.ASSIGNMENT_SERVICE_URL}`);
  console.log(`- Inventory Service  : ${env.INVENTORY_SERVICE_URL}`);
  console.log(`- Audit Service      : ${env.AUDIT_SERVICE_URL}`);
});
