import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 4005;

app.listen(PORT, () => {
  console.log(`inventory-service running on port ${PORT}`);
});
// reload 2

