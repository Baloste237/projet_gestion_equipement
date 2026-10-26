import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { assertSecurityConfig } from "./middlewares/security";

// Refuse de démarrer sans secret : aucune valeur de repli
assertSecurityConfig();

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  console.log(`User service is running on port ${PORT}`);
});
