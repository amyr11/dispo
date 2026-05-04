export const eventQueryKeys = {
  all: ["events"] as const,
  list: () => [...eventQueryKeys.all, "list"] as const,
  detail: (eventId: number) => [...eventQueryKeys.all, "detail", eventId] as const,
  stats: (eventId: number) => [...eventQueryKeys.all, "stats", eventId] as const,
}
