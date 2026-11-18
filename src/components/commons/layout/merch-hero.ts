// Shared look of the "Welcome back" hero cards on the Seller and Admin dashboards, so the two stay alike.

// Light: the product photo fades in from the left so its pale backdrop melts into the card.
// Dark: the studio shot fills the whole right half, full card height, and a card-coloured scrim
// on its left edge dissolves it into the dark surface (a mask would expose a grey smear instead).
export const HERO_MERCH_FRAME =
  "[mask-image:linear-gradient(to_right,transparent_0%,black_15%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_15%)] dark:aspect-auto dark:w-[50%] dark:max-w-none dark:overflow-hidden dark:[mask-image:none] dark:[-webkit-mask-image:none]";

// The one action as a soft pill with dark text: clear on the card, easy on the eye.
// Dark: the brand-blue pill, like the other primary actions.
export const HERO_PRIMARY_ACTION =
  "inline-flex items-center gap-1.5 max-sm:w-full max-sm:justify-center rounded-full bg-card px-4 py-2 text-ink-900 shadow-sm ring-1 ring-ink-300 backdrop-blur transition hover:-translate-y-0.5 hover:bg-ink-50 hover:shadow-md dark:bg-primary dark:text-primary-foreground dark:ring-0 dark:hover:bg-primary/90";
