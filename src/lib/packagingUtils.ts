// Utilities for parsing and handling packaging options

export interface ParsedPackaging {
  name: string;
  unitSize: number;
  unitType: 'gal' | 'lbs';
}

// Common packaging patterns
const PACKAGING_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /tote/i, name: 'Tote' },
  { pattern: /drum/i, name: 'Drum' },
  { pattern: /jug/i, name: 'Jug' },
  { pattern: /twin[\s-]?pack/i, name: 'Twin-Pack' },
  { pattern: /case/i, name: 'Case' },
  { pattern: /bag/i, name: 'Bag' },
  { pattern: /pail|bucket/i, name: 'Pail' },
  { pattern: /bottle/i, name: 'Bottle' },
];

// Parse a packaging string like "275 gal tote" or "2.5 gal jug"
export function parsePackagingString(packagingStr: string | undefined): ParsedPackaging | null {
  if (!packagingStr) return null;
  
  // Try to extract size and unit
  const sizeMatch = packagingStr.match(/(\d+\.?\d*)\s*(gal|gallon|lb|lbs|pound)/i);
  if (!sizeMatch) return null;
  
  const unitSize = parseFloat(sizeMatch[1]);
  const unitType: 'gal' | 'lbs' = sizeMatch[2].toLowerCase().startsWith('gal') ? 'gal' : 'lbs';
  
  // Try to identify packaging type
  let name = 'Container';
  for (const { pattern, name: packName } of PACKAGING_PATTERNS) {
    if (pattern.test(packagingStr)) {
      name = packName;
      break;
    }
  }
  
  return { name, unitSize, unitType };
}

// Get common packaging options for a product form
export function getDefaultPackagingOptions(form: 'liquid' | 'dry'): ParsedPackaging[] {
  if (form === 'liquid') {
    return [
      { name: 'Tote', unitSize: 275, unitType: 'gal' },
      { name: 'Drum', unitSize: 30, unitType: 'gal' },
      { name: 'Jug', unitSize: 2.5, unitType: 'gal' },
      { name: 'Pail', unitSize: 5, unitType: 'gal' },
    ];
  } else {
    return [
      { name: 'Tote', unitSize: 2000, unitType: 'lbs' },
      { name: 'Bag', unitSize: 50, unitType: 'lbs' },
      { name: 'Bag', unitSize: 40, unitType: 'lbs' },
    ];
  }
}

// Format packaging for display
export function formatPackaging(name: string, size: number, unitType: 'gal' | 'lbs'): string {
  return `${name} – ${size} ${unitType}`;
}

// Format inventory display with containers
export function formatInventoryDisplay(
  containerCount: number | undefined,
  packagingName: string | undefined,
  packagingSize: number | undefined,
  totalQuantity: number,
  unit: 'gal' | 'lbs'
): { primary: string; secondary: string } {
  if (containerCount && packagingName && packagingSize) {
    return {
      primary: `${containerCount} × ${packagingSize} ${unit} ${packagingName.toLowerCase()}${containerCount > 1 ? 's' : ''}`,
      secondary: `(${totalQuantity} ${unit} total)`,
    };
  }
  
  return {
    primary: `${totalQuantity} ${unit}`,
    secondary: '(bulk)',
  };
}
