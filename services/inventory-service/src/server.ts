import "dotenv/config";
import app from "./app";
import { startKpiConsumer } from "./consumers/kpi.consumer";
import { kpiSyncService } from "./services/kpi-sync.service";

const PORT = process.env.PORT || 4005;

// Initialise les compteurs au premier démarrage (réessaie tant que les services source sont indisponibles)
const seedKpis = async (): Promise<void> => {
  try {
    if (await kpiSyncService.seedIfEmpty()) console.log("[kpi] Compteurs initialisés depuis les données existantes");
  } catch (err: any) {
    console.warn("[kpi] Initialisation impossible, nouvel essai dans 10s:", err?.message || err);
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return seedKpis();
  }
};

startKpiConsumer(seedKpis);

app.listen(PORT, () => {
  console.log(`inventory-service running on port ${PORT}`);
});
// reload 2

