import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTRACTION_PROMPT = `You are an agricultural product label analyst. Extract structured data from this product label.

Return a JSON object with the following structure:
{
  "npks": {
    "n": <number 0-100>,
    "nForm": "<'urea' | 'nh4' | 'no3' | 'mixed' | null>",
    "p": <number 0-100>,
    "k": <number 0-100>,
    "s": <number 0-100>,
    "sForm": "<'sulfate' | 'thiosulfate' | 'elemental' | null>"
  },
  "micros": {
    "boron": <number or null>,
    "zinc": <number or null>,
    "manganese": <number or null>,
    "iron": <number or null>,
    "copper": <number or null>,
    "molybdenum": <number or null>,
    "cobalt": <number or null>,
    "nickel": <number or null>
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
  "extractionConfidence": "<high | medium | low>",
  "suggestedRoles": ["<fertility-macro, fertility-micro, biostimulant, carbon-biology-food, stress-mitigation, uptake-translocation, nitrogen-conversion, rooting-vigor, water-conditioning, adjuvant>"]
}

Rules:
- Extract ONLY what's explicitly stated on the label
- Use null for values not found
- Set extractionConfidence to "high" if most key data is clearly found, "medium" if some is ambiguous, "low" if label is hard to read or incomplete
- For suggestedRoles, infer based on the product composition (e.g., has microbials = biostimulant, high NPK = fertility-macro)
- All nutrient percentages should be numeric (e.g., 10-34-0 means n=10, p=34, k=0)
- For density, look for "lbs/gal", "weight per gallon", or "density"

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { labelText, labelBase64, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const messages: any[] = [
      { role: 'system', content: EXTRACTION_PROMPT },
    ];

    // If we have base64 PDF/image, include it
    if (labelBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Extract product analysis from this label. File name: ${fileName || 'unknown'}` },
          { 
            type: 'image_url', 
            image_url: { url: labelBase64 } 
          }
        ]
      });
    } else if (labelText) {
      messages.push({
        role: 'user',
        content: `Extract product analysis from this label text:\n\n${labelText}`
      });
    } else {
      throw new Error('Either labelText or labelBase64 is required');
    }

    console.log('Calling Lovable AI for label extraction...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

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
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let extracted;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Build the result
    const result = {
      analysis: {
        npks: extracted.npks || { n: 0, p: 0, k: 0, s: 0 },
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
    };

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
