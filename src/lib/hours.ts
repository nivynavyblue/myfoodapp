import type { DayHours, OpeningHours } from "@/types/restaurant";

export const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const TIME_RE = /^\d{2}:\d{2}$/;

function dayHours(hours: OpeningHours | null | undefined, day: number): DayHours {
  const h = hours?.[String(day) as keyof OpeningHours];
  return h && TIME_RE.test(h.open) && TIME_RE.test(h.close) ? h : null;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function hasAnyHours(hours: OpeningHours | null | undefined): boolean {
  return [0, 1, 2, 3, 4, 5, 6].some((d) => dayHours(hours, d));
}

export function todayHours(
  hours: OpeningHours | null | undefined,
  now: Date = new Date(),
): DayHours {
  return dayHours(hours, now.getDay());
}

/** True when `now` falls inside an open range, including ranges spilling past midnight from yesterday. */
export function isOpenNow(
  hours: OpeningHours | null | undefined,
  now: Date = new Date(),
): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = dayHours(hours, now.getDay());
  if (today) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (open < close ? minutes >= open && minutes < close : minutes >= open) {
      return true;
    }
  }
  const yesterday = dayHours(hours, (now.getDay() + 6) % 7);
  if (yesterday) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (close < open && minutes < close) return true;
  }
  return false;
}

/** Groups consecutive days sharing the same times, e.g. "Seg–Sex 11:00–22:00". */
export function summarizeHours(hours: OpeningHours | null | undefined): string[] {
  const lines: string[] = [];
  let start = -1;
  const key = (d: number) => {
    const h = dayHours(hours, d);
    return h ? `${h.open}–${h.close}` : null;
  };
  for (let d = 0; d <= 7; d++) {
    const cur = d < 7 ? key(d) : null;
    const prev = d > 0 ? key(d - 1) : null;
    if (start >= 0 && cur !== prev) {
      const label =
        start === d - 1 ? DAY_LABELS[start] : `${DAY_LABELS[start]}–${DAY_LABELS[d - 1]}`;
      lines.push(`${label} ${prev}`);
      start = -1;
    }
    if (cur && start < 0) start = d;
  }
  return lines;
}
