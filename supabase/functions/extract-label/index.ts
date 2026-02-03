import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXTRACTION_PROMPT = `You are an agricultural product label and SDS analyst. Extract ALL available structured data from this document.

CRITICAL EXTRACTION RULES:
1. Manufacturer is ALWAYS on page 1 - extract it (e.g., "BASF Corporation", "Corteva Agriscience")
2. If PHI varies by crop, set phiDays to null and populate phiByCrop array with ALL crop-specific intervals
3. If rates vary by soil type or organic matter, populate rateRange.byCondition array
4. Look for buffer zone tables - differentiate aerial vs ground, standard vs endangered species
5. Extract ALL adjuvant requirements (COC, NIS, AMS, UAN, MSO) with their rates
6. Look for grazing/feeding restrictions in addition to PHI

Return a JSON object with the following structure:
{
  "productName": "<exact product name from label>",
  "form": "<'liquid' | 'dry' | null>",
  "category": "<'biological' | 'micronutrient' | 'herbicide' | 'fungicide' | 'insecticide' | 'seed-treatment' | 'adjuvant' | 'fertilizer-liquid' | 'fertilizer-dry' | 'other' | null>",
  "manufacturer": "<company/manufacturer name - ALWAYS extract from page 1>",
  "npks": {
    "n": <number 0-100>,
    "nForm": "<'urea' | 'nh4' | 'no3' | 'mixed' | null>",
    "p": <number 0-100>,
    "k": <number 0-100>,
    "s": <number 0-100>,
    "sForm": "<'sulfate' | 'thiosulfate' | 'elemental' | null>"
  },
  "secondary": {
    "ca": <number or null - Calcium %>,
    "mg": <number or null - Magnesium %>,
    "c": <number or null - Carbon/Organic matter %>
  },
  "micros": {
    "b": <number or null - Boron %>,
    "zn": <number or null - Zinc %>,
    "mn": <number or null - Manganese %>,
    "fe": <number or null - Iron %>,
    "cu": <number or null - Copper %>,
    "mo": <number or null - Molybdenum %>,
    "co": <number or null - Cobalt %>,
    "ni": <number or null - Nickel %>,
    "cl": <number or null - Chlorine %>
  },
  "carbonSources": {
    "humicAcid": <number or null>,
    "fulvicAcid": <number or null>,
    "sugars": "<string description or null>",
    "organicAcids": "<string description or null>",
    "aminoAcids": "<string description or null>"
  },
  "biology": {
    "microbes": ["<species names>"],
    "enzymes": ["<enzyme names>"],
    "metabolites": ["<metabolite names>"],
    "cfuPerMl": <number or null>
  },
  "densityLbsPerGal": <number or null>,
  "approvedUses": ["<foliar, in-furrow, fertigation, seed treatment, etc>"],
  "activeIngredients": "<string list of active ingredients>",
  "applicationRates": "<string summary of recommended rates>",
  "mixingInstructions": "<string mixing/compatibility notes>",
  "storageHandling": "<string storage and handling notes>",
  "cautions": "<string cautions, precautions, or safety notes>",
  "extractionConfidence": "<high | medium | low>",
  "suggestedRoles": ["<fertility-macro, fertility-micro, biostimulant, carbon-biology-food, stress-mitigation, uptake-translocation, nitrogen-conversion, rooting-vigor, water-conditioning, adjuvant>"],
  
  "chemicalData": {
    "activeIngredients": [
      {
        "name": "<active ingredient name>",
        "concentration": "<e.g., 41%, 4 lb/gal, 63.9%>",
        "concentrationLbPerGal": <number if stated as lb/gal>,
        "unit": "<'ae' | 'ai' | 'lbs/gal' | '%'>",
        "chemicalClass": "<e.g., chloroacetamide, glycine>",
        "moaGroup": "<Mode of Action group number, e.g., 15, 9>",
        "moaGroupName": "<Name like VLCFA Inhibitor, EPSP synthase inhibitor>",
        "chemicalFamily": "<e.g., glycine, triazine>"
      }
    ],
    
    "rateRange": {
      "min": <minimum rate number>,
      "max": <maximum rate number>,
      "typical": <typical/recommended rate or null>,
      "unit": "<fl oz/ac, pt/ac, oz/ac, etc>",
      "notes": "<rate guidance notes>",
      "byCondition": [
        {
          "condition": "<e.g., Coarse soils <3% OM, Medium/Fine soils ≥3% OM>",
          "min": <min rate>,
          "max": <max rate>,
          "unit": "<fl oz/ac, etc>",
          "notes": "<any notes>"
        }
      ]
    },
    
    "applicationRequirements": {
      "carrierGpaMinAerial": <minimum gal/ac for aerial application>,
      "carrierGpaMinGround": <minimum gal/ac for ground application>,
      "carrierGpaMin": <general minimum if not split>,
      "carrierGpaMax": <maximum carrier volume or null>,
      "dropletSize": "<'fine' | 'medium' | 'coarse' | 'very-coarse' | 'extremely-coarse' | 'ultra-coarse'>",
      "sprayPressureMin": <min PSI>,
      "sprayPressureMax": <max PSI>,
      "applicationMethods": ["<Preplant, Preplant Incorporated, Preemergence, Postemergence, etc>"],
      "applicationTiming": "<description of when to apply, growth stages, etc>",
      "notes": "<any additional application notes>"
    },
    
    "adjuvantRequirements": [
      {
        "type": "<'MSO' | 'COC' | 'NIS' | 'AMS' | 'UAN' | 'oil-adjuvant' | 'surfactant' | 'drift-retardant' | 'water-conditioner' | 'other'>",
        "isRequired": <true if required, false if recommended/optional>,
        "rate": "<rate with unit, e.g., 1 qt/ac, 0.25% v/v, 2.5 lb/100 gal>",
        "notes": "<when to use, conditions>"
      }
    ],
    
    "restrictions": {
      "phiDays": <pre-harvest interval in days, or null if varies by crop>,
      "phiByCrop": [
        {
          "crop": "<crop name>",
          "days": <PHI days>,
          "notes": "<any notes>"
        }
      ],
      "reiHours": <Restricted Entry Interval in hours>,
      "maxRatePerApplication": { "value": <number>, "unit": "<fl oz/ac, pt/ac, lb ai/ac>" },
      "maxRatePerSeason": { "value": <number>, "unit": "<fl oz/ac, pt/ac, lb ai/ac>" },
      "maxApplicationsPerSeason": <number or null>,
      "minDaysBetweenApplications": <number or null>,
      
      "bufferZoneAerialFeet": <standard buffer for aerial>,
      "bufferZoneGroundFeet": <standard buffer for ground>,
      "endangeredSpeciesBufferAerialFeet": <endangered species buffer for aerial>,
      "endangeredSpeciesBufferGroundFeet": <endangered species buffer for ground>,
      "bufferZoneFeet": <single buffer if not differentiated>,
      
      "groundwaterAdvisory": <true if groundwater advisory mentioned>,
      "groundwaterNotes": "<specific groundwater restrictions>",
      "pollinator": "<pollinator protection statement or null>",
      "rainfast": "<rainfast period, e.g., 1 hour, 4 hours>",
      
      "rotationRestrictions": [
        {
          "crop": "<crop name>",
          "days": <days or null>,
          "months": <months or null>,
          "conditions": "<e.g., if rate <16 fl oz/ac>",
          "notes": "<any additional info>"
        }
      ],
      
      "grazingRestrictions": [
        {
          "crop": "<crop name>",
          "days": <days before grazing/feeding>,
          "notes": "<notes>"
        }
      ],
      
      "notes": "<any other restriction notes>"
    },
    
    "mixingOrder": {
      "priority": <1-10 based on formulation type>,
      "category": "<'water-conditioner' | 'compatibility-agent' | 'dry-flowable' | 'wettable-powder' | 'suspension' | 'emulsifiable-concentrate' | 'solution' | 'surfactant' | 'drift-retardant' | 'other'>",
      "notes": "<mixing order instructions from label>"
    },
    
    "compatibility": {
      "antagonists": ["<products that reduce efficacy>"],
      "synergists": ["<products that enhance efficacy>"],
      "incompatible": ["<products causing physical incompatibility, fertilizers to avoid>"],
      "jarTest": <true if jar test recommended>,
      "notes": "<compatibility notes>"
    },
    
    "signalWord": "<'danger' | 'warning' | 'caution' | 'none'>",
    "epaRegNumber": "<EPA registration number, format XXXXX-XXX>",
    "formulationType": "<'EC' | 'SC' | 'SL' | 'WDG' | 'DF' | 'WP' | 'ME' | 'SE' | 'G' | 'L' | other>"
  }
}

EXTRACTION RULES:
- Extract EVERYTHING explicitly stated on the label/SDS
- Use null for values not found
- For productName, use the main product name displayed on the label
- For manufacturer, look on page 1 - it's usually at the top or bottom
- For form, determine if it's a liquid or dry product based on packaging description, density info, or application instructions
- For category, infer from the product type and use
- Set extractionConfidence to "high" if most key data is clearly found, "medium" if some is ambiguous, "low" if document is hard to read
- For suggestedRoles, infer based on the product composition
- All nutrient percentages should be numeric (e.g., 10-34-0 means n=10, p=34, k=0)
- For density, look for "lbs/gal", "weight per gallon", "density", or "specific gravity"
- For applicationRates, summarize the recommended rates per acre or per 100 lbs seed
- For mixingInstructions, include any compatibility info, order of mixing, or tank-mix notes
- Extract safety info from SDS documents into cautions field
- For secondary nutrients (Ca, Mg, C), look for Calcium, Magnesium, Carbon, Organic Matter percentages
- For micros, look for trace element percentages - they are often listed as small decimals like 0.05%

PESTICIDE-SPECIFIC EXTRACTION:
- Look for "Active Ingredient(s)" section for detailed ingredient data
- PHI (Pre-Harvest Interval) is often in "Directions for Use" or "Restrictions" section
- If PHI varies by crop, set phiDays to null and populate phiByCrop array with ALL crops
- REI (Restricted Entry Interval) is usually stated in hours
- Rotational crop restrictions are in "Rotational Crop Restrictions" or "Crop Rotation" section
- EPA Reg. No. is usually on the front of the label
- Signal word (DANGER, WARNING, CAUTION) is prominently displayed
- Formulation type (EC, SC, WDG, etc.) is often in the product name or near active ingredients
- For mixing order priority: EC=6, SC/F=5, SL/S=7, WDG/DF=3, WP=4

RATE EXTRACTION:
- Look for rate tables with soil type columns
- "Coarse soils" vs "Medium/Fine soils"
- "<3% OM" vs "≥3% OM"
- Extract ALL rate variations into byCondition array

CARRIER VOLUME:
- Often stated as "minimum carrier volume"
- May differ for aerial vs ground application
- Ground is usually higher than aerial

ADJUVANT EXTRACTION:
- Look for "Adjuvants", "Surfactants", "Tank Mix Partners" sections
- COC: crop oil concentrate (1 qt/ac typical)
- NIS: non-ionic surfactant (0.25% v/v typical)
- AMS: ammonium sulfate (2-4 lb/100 gal typical)
- MSO: methylated seed oil
- UAN: urea ammonium nitrate

BUFFER ZONES:
- Standard buffer zones (all applications)
- Endangered species buffer zones (separate section, often higher)
- Differentiate aerial vs ground application buffers

IMPORTANT: Return ONLY valid JSON, no markdown code blocks, no explanation. Just the JSON object.`;

function parseJsonResponse(content: string): any {
  // Try direct parse first
  try {
    return JSON.parse(content.trim());
  } catch {
    // Continue to cleaning attempts
  }

  // Remove markdown code blocks
  let cleanContent = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try parsing cleaned content
  try {
    return JSON.parse(cleanContent);
  } catch {
    // Continue to more aggressive cleaning
  }

  // Try to find JSON object in the content
  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Failed to parse extracted JSON
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { labelText, labelBase64, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const messages: any[] = [
      { role: 'system', content: EXTRACTION_PROMPT },
    ];

    // Determine media type from base64 header
    let mediaType = 'application/pdf';
    if (labelBase64) {
      if (labelBase64.startsWith('data:image/png')) {
        mediaType = 'image/png';
      } else if (labelBase64.startsWith('data:image/jpeg') || labelBase64.startsWith('data:image/jpg')) {
        mediaType = 'image/jpeg';
      } else if (labelBase64.startsWith('data:image/webp')) {
        mediaType = 'image/webp';
      }
    }

    console.log('Processing document:', fileName, 'Media type:', mediaType);

    // If we have base64 PDF/image, include it
    if (labelBase64) {
      messages.push({
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `Extract product analysis from this label document. File name: ${fileName || 'unknown'}. Please return ONLY valid JSON with no markdown formatting.` 
          },
          { 
            type: 'image_url', 
            image_url: { url: labelBase64 } 
          }
        ]
      });
    } else if (labelText) {
      messages.push({
        role: 'user',
        content: `Extract product analysis from this label text. Return ONLY valid JSON:\n\n${labelText}`
      });
    } else {
      throw new Error('Either labelText or labelBase64 is required');
    }

    console.log('Calling Lovable AI for label extraction...');
    
    // Use gemini-2.5-flash for faster PDF handling with good quality
    const model = 'google/gemini-2.5-flash';
    console.log('Using model:', model);
    
    const startTime = Date.now();
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });
    
    console.log('AI response received in', Date.now() - startTime, 'ms, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response length:', content?.length || 0);
    console.log('AI response preview:', content?.substring(0, 200));

    if (!content || content.trim().length < 10) {
      console.error('Empty or too short AI response:', content);
      throw new Error('AI returned an empty or invalid response. The document may be unreadable or in an unsupported format.');
    }

    // Parse the JSON response with robust handling
    const extracted = parseJsonResponse(content);
    
    if (!extracted) {
      console.error('Failed to parse AI response as JSON. Content:', content.substring(0, 500));
      throw new Error('Failed to parse AI response. The model returned invalid JSON. Please try a different document or format.');
    }

    // Build the result with all extracted fields
    const result = {
      // Product master fields
      productName: extracted.productName || null,
      form: extracted.form || null,
      category: extracted.category || null,
      densityLbsPerGal: extracted.densityLbsPerGal || null,
      activeIngredients: extracted.activeIngredients || null,
      manufacturer: extracted.manufacturer || null,
      
      // Notes fields
      applicationRates: extracted.applicationRates || null,
      mixingInstructions: extracted.mixingInstructions || null,
      storageHandling: extracted.storageHandling || null,
      cautions: extracted.cautions || null,
      
      // Analysis
      analysis: {
        npks: extracted.npks || { n: 0, p: 0, k: 0, s: 0 },
        secondary: extracted.secondary,
        micros: extracted.micros,
        carbonSources: extracted.carbonSources,
        biology: extracted.biology,
        densityLbsPerGal: extracted.densityLbsPerGal,
        approvedUses: extracted.approvedUses || [],
        extractionConfidence: extracted.extractionConfidence || 'medium',
        extractedAt: new Date().toISOString(),
        sourceFileName: fileName,
      },
      suggestedRoles: extracted.suggestedRoles || [],
      
      // Chemical/Pesticide data (for herbicides, fungicides, insecticides)
      chemicalData: extracted.chemicalData || null,
    };

    console.log('Successfully extracted product data:', result.productName);
    if (result.chemicalData) {
      console.log('Chemical data extracted:', JSON.stringify(result.chemicalData).substring(0, 200));
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in extract-label function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
