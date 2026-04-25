// Format: ABC-123 (3 uppercase letters + dash + 3 digits)
export function generateClassCode(): string {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('')
  const digits = String(Math.floor(Math.random() * 900) + 100)
  return `${letters}-${digits}`
}

export function validateClassCode(code: string): boolean {
  return /^[A-Z]{3}-\d{3}$/.test(code)
}
