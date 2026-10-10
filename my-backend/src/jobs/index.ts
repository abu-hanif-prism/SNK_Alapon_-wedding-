import { expireReservations } from "./expireReservations";
import { expireSubscriptions } from "./expireSubscriptions";
import { startPhotoProcessor } from "./photoProcessor";

const EXPIRE_RESERVATIONS_EVERY_MS = 60_000;
const EXPIRE_SUBSCRIPTIONS_EVERY_MS = 5 * 60_000;

async function runExpireSubscriptions() {
  try {
    const result = await expireSubscriptions();
    if (result.subscriptions > 0) {
      console.log(`Expired ${result.subscriptions} subscription(s), archived ${result.events} event(s)`);
    }
  } catch (error) {
    console.error("expireSubscriptions failed:", error);
  }
}

// Starts every background job in this process. Returns a function that stops them.
export function startJobs() {
  const stopProcessor = startPhotoProcessor();

  const reservationTimer = setInterval(() => {
    expireReservations().catch((error) => console.error("expireReservations failed:", error));
  }, EXPIRE_RESERVATIONS_EVERY_MS);

  const subscriptionTimer = setInterval(() => void runExpireSubscriptions(), EXPIRE_SUBSCRIPTIONS_EVERY_MS);
  void runExpireSubscriptions(); // catch up right after a restart

  console.log("Background jobs started: photo processor, reservation expiry, subscription expiry");

  return () => {
    stopProcessor();
    clearInterval(reservationTimer);
    clearInterval(subscriptionTimer);
  };
}
