import amqp, { Channel, ConsumeMessage } from "amqplib";
import { kpiRepository } from "../repositories/kpi.repository";
import { deltasForEvent, DomainEvent } from "../kpi/kpi.metrics";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
const EXCHANGE = "equipment.events";
const QUEUE = "inventory-service.kpi";
const ROUTING_KEYS = ["equipment.*", "assignment.*"];
const RETRY_DELAY_MS = 5000;

const parseEvent = (msg: ConsumeMessage): DomainEvent | null => {
  try {
    const event = JSON.parse(msg.content.toString());
    return typeof event?.eventId === "string" && typeof event?.type === "string" ? event : null;
  } catch {
    return null;
  }
};

const handleMessage = (channel: Channel) => async (msg: ConsumeMessage | null) => {
  if (!msg) return;

  const event = parseEvent(msg);
  if (!event) {
    console.error("[kpi-consumer] Message invalide ignoré:", msg.content.toString().slice(0, 200));
    return channel.ack(msg);
  }

  try {
    const applied = await kpiRepository.applyEvent(event, deltasForEvent(event));
    if (!applied) console.log(`[kpi-consumer] Événement déjà traité, ignoré: ${event.eventId}`);
    channel.ack(msg);
  } catch (err) {
    // Erreur transitoire (base indisponible…) : on remet le message en file après un délai
    console.error(`[kpi-consumer] Échec du traitement de ${event.type}, nouvel essai dans 5s`, err);
    setTimeout(() => channel.nack(msg, false, true), RETRY_DELAY_MS);
  }
};

/**
 * Consomme les événements métier pour maintenir les compteurs du dashboard.
 * La file est déclarée et liée avant `beforeConsume` (initialisation des compteurs),
 * de sorte que les événements émis pendant l'initialisation sont conservés.
 */
let restartTimer: NodeJS.Timeout | null = null;

// Une seule reconnexion planifiée à la fois (échec de démarrage et fermeture peuvent survenir ensemble)
const scheduleRestart = (beforeConsume: () => Promise<void>) => {
  if (restartTimer) return;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    startKpiConsumer(beforeConsume);
  }, RETRY_DELAY_MS);
};

export const startKpiConsumer = async (beforeConsume: () => Promise<void>): Promise<void> => {
  let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    connection.on("error", (err: any) => console.error("[kpi-consumer] Erreur de connexion:", err?.message || err));
    connection.on("close", () => {
      console.warn("[kpi-consumer] Connexion fermée, reconnexion dans 5s...");
      scheduleRestart(beforeConsume);
    });

    await channel.assertExchange(EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    for (const key of ROUTING_KEYS) await channel.bindQueue(QUEUE, EXCHANGE, key);

    await beforeConsume();

    // Un message à la fois : les événements sont appliqués dans l'ordre de publication
    await channel.prefetch(1);
    await channel.consume(QUEUE, handleMessage(channel));
    console.log(`[kpi-consumer] En écoute sur ${QUEUE} (${ROUTING_KEYS.join(", ")})`);
  } catch (err: any) {
    console.error("[kpi-consumer] Démarrage impossible, nouvel essai dans 5s:", err?.message || err);
    connection?.close().catch(() => {});
    scheduleRestart(beforeConsume);
  }
};
