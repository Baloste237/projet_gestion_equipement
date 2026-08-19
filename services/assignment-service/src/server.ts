import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = process.env.PORT || 4004;

app.listen(PORT, () => {
  console.log(`Assignment service is running on port ${PORT}`);
});
// reload 3

