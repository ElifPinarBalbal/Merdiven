export function sanitizeForTelegramHTML(text) {
    return text
      .replace(/&/g, "&amp;")         // must be first
      //.replace(/</g, "&lt;")
      //.replace(/>/g, "&gt;")
      .replace(/'/g, "")
      .replace(/"/g, "");
}