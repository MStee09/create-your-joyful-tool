// ============================================================================
// Known Manufacturers Reference
// For autocomplete, URL detection, and label finder links
// ============================================================================

export interface KnownManufacturer {
  name: string;
  urlPattern: string;
  labelSearchUrl?: string;
  aliases?: string[];
}

export const KNOWN_MANUFACTURERS: KnownManufacturer[] = [
  { 
    name: 'BASF', 
    urlPattern: 'agriculture.basf.us', 
    labelSearchUrl: 'https://agriculture.basf.us/crop-protection/products.html',
    aliases: ['BASF Corporation']
  },
  { 
    name: 'Bayer', 
    urlPattern: 'cropscience.bayer.us', 
    labelSearchUrl: 'https://www.cropscience.bayer.us/products',
    aliases: ['Bayer CropScience']
  },
  { 
    name: 'Corteva', 
    urlPattern: 'corteva.us', 
    labelSearchUrl: 'https://www.corteva.us/products-and-solutions.html',
    aliases: ['Corteva Agriscience', 'Dow AgroSciences']
  },
  { 
    name: 'Syngenta', 
    urlPattern: 'syngenta-us.com', 
    labelSearchUrl: 'https://www.syngenta-us.com/product-list',
    aliases: ['Syngenta Crop Protection']
  },
  { 
    name: 'FMC', 
    urlPattern: 'fmc.com', 
    labelSearchUrl: 'https://www.fmcagricultural.com/products',
    aliases: ['FMC Corporation', 'FMC Agricultural']
  },
  { 
    name: 'AMVAC', 
    urlPattern: 'amvac.com', 
    labelSearchUrl: 'https://amvac.com/products',
    aliases: ['AMVAC Chemical Corporation']
  },
  { 
    name: 'Nufarm', 
    urlPattern: 'nufarm.com',
    labelSearchUrl: 'https://nufarm.com/usag/products/',
    aliases: ['Nufarm Americas']
  },
  { 
    name: 'UPL', 
    urlPattern: 'upl-ltd.com',
    labelSearchUrl: 'https://www.upl-ltd.com/us/products',
    aliases: ['UPL NA', 'United Phosphorus']
  },
  { 
    name: 'Valent', 
    urlPattern: 'valent.com',
    labelSearchUrl: 'https://www.valent.com/products',
    aliases: ['Valent USA']
  },
  { 
    name: 'Winfield United', 
    urlPattern: 'winfieldunited.com',
    labelSearchUrl: 'https://www.winfieldunited.com/products',
    aliases: ['Winfield Solutions', 'WinField']
  },
  { 
    name: 'ADAMA', 
    urlPattern: 'adama.com',
    labelSearchUrl: 'https://www.adama.com/us/en/products',
    aliases: ['ADAMA Agricultural Solutions']
  },
  { 
    name: 'Albaugh', 
    urlPattern: 'albaughllc.com',
    labelSearchUrl: 'https://www.albaughllc.com/products',
    aliases: ['Albaugh LLC']
  },
  { 
    name: 'Helena', 
    urlPattern: 'helenaagri.com',
    labelSearchUrl: 'https://www.helenaagri.com/products',
    aliases: ['Helena Chemical Company', 'Helena Agri-Enterprises']
  },
  { 
    name: 'Loveland Products', 
    urlPattern: 'lovelandproducts.com',
    labelSearchUrl: 'https://www.lovelandproducts.com/products',
    aliases: ['Loveland']
  },
  { 
    name: 'Nichino America', 
    urlPattern: 'nichino.net',
    aliases: ['Nichino']
  },
  { 
    name: 'Sipcam Agro', 
    urlPattern: 'sipcamadvan.com',
    aliases: ['Sipcam', 'Advan']
  },
  { 
    name: 'Atticus', 
    urlPattern: 'atticusllc.com',
    aliases: ['Atticus LLC']
  },
  { 
    name: 'Drexel Chemical', 
    urlPattern: 'drexchem.com',
    aliases: ['Drexel']
  },
];

/**
 * Find a manufacturer by URL pattern match
 */
export function findManufacturerByUrl(url: string): KnownManufacturer | null {
  const lowerUrl = url.toLowerCase();
  return KNOWN_MANUFACTURERS.find(m => lowerUrl.includes(m.urlPattern.toLowerCase())) || null;
}

/**
 * Find a manufacturer by name or alias (case-insensitive)
 */
export function findManufacturerByName(name: string): KnownManufacturer | null {
  const lowerName = name.toLowerCase().trim();
  return KNOWN_MANUFACTURERS.find(m => 
    m.name.toLowerCase() === lowerName ||
    m.aliases?.some(alias => alias.toLowerCase() === lowerName)
  ) || null;
}

/**
 * Get all manufacturer names for autocomplete
 */
export function getManufacturerNames(): string[] {
  return KNOWN_MANUFACTURERS.map(m => m.name);
}

/**
 * Get label search URL for a manufacturer
 */
export function getLabelSearchUrl(manufacturerName: string): string | null {
  const manufacturer = findManufacturerByName(manufacturerName);
  return manufacturer?.labelSearchUrl || null;
}

/**
 * Check if a manufacturer name matches a known manufacturer
 */
export function isKnownManufacturer(name: string): boolean {
  return findManufacturerByName(name) !== null;
}
