export function sanitizeModelText(text: string) {
  return text.replace(/<\/?[^>]+(>|$)/g, "")
}
