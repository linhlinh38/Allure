export function generateMeaningfulCode(purpose: string = '', length: number = 6): string {
  // Predefined prefixes based on common voucher types
  const prefixes = {
    WELCOME: 'WELCOME',
    NEW: 'NEWUSER',
    HOLIDAY: 'HOLIDAY',
    SEASON: 'SEASON',
    SPECIAL: 'SPECIAL',
    FLASH: 'FLASH',
    GROUP: 'GROUP',
    LOYAL: 'LOYAL',
    BRAND: 'BRAND',
    PROMO: 'PROMO',
    COMPENSATE_GROUP: 'COMPENSATE_GROUP'
  }

  // Use provided purpose or pick a random one
  let prefix = purpose.toUpperCase()
  if (!prefix) {
    const prefixKeys = Object.keys(prefixes) as Array<keyof typeof prefixes>
    prefix = prefixes[prefixKeys[Math.floor(Math.random() * prefixKeys.length)]]
  }

  // Generate random alphanumeric string for the code
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed similar looking characters like 0, O, 1, I
  let randomPart = ''

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    randomPart += characters[randomIndex]
  }

  // Add current month and year to make codes time-specific
  const date = new Date()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(2) // Last two digits of year

  return `${prefix}-${randomPart}${month}${year}`
}