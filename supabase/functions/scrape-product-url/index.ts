import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTRACTION_PROMPT = `You are an agricultural product analyst. Extract structured data from this product webpage content.

Return a JSON object with the following structure:
{
  "productName": "<string - the official product name>",
  "form": "<'liquid' | 'dry' | null>",
  "category": "<'biological' | 'micronutrient' | 'herbicide' | 'fungicide' | 'seed-treatment' | 'adjuvant' | 'fertilizer-liquid' | 'fertilizer-dry' | 'other' | null>",
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
  "activeIngredients": "<string - list of active ingredients if found>",
  "generalNotes": "<string - any important product notes or description>",
  "extractionConfidence": "<high | medium | low>",
  "suggestedRoles": ["<fertility-macro, fertility-micro, biostimulant, carbon-biology-food, stress-mitigation, uptake-translocation, nitrogen-conversion, rooting-vigor, water-conditioning, adjuvant>"]
}

Rules:
- Extract ONLY what's explicitly stated on the page
- Use null for values not found
- Set extractionConfidence to "high" if most key data is clearly found, "medium" if some is ambiguous, "low" if page content is limited
- For suggestedRoles, infer based on the product composition (e.g., has microbials = biostimulant, high NPK = fertility-macro)
- All nutrient percentages should be numeric (e.g., 10-34-0 means n=10, p=34, k=0)
- For density, look for "lbs/gal", "weight per gallon", or "density"
- For category, infer from product type (fertilizer, biological, adjuvant, etc.)
- For form, look for liquid/dry/granular mentions

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Fetching URL:', url);

    // Fetch the webpage content
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch URL: ${pageResponse.status} ${pageResponse.statusText}`);
    }

    const html = await pageResponse.text();
    
    // Simple HTML to text conversion - strip tags and clean up
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit content to avoid token limits

    console.log('Extracted text length:', textContent.length);

    if (textContent.length < 100) {
      throw new Error('Could not extract meaningful content from the page. The page may require JavaScript to load content.');
    }

    // Call Lovable AI to extract structured data
    const messages = [
      { role: 'system', content: EXTRACTION_PROMPT },
      { 
        role: 'user', 
        content: `Extract product information from this webpage content. Source URL: ${url}\n\nPage content:\n${textContent}` 
      }
    ];

    console.log('Calling Lovable AI for URL extraction...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let extracted;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Build the result
    const result = {
      productName: extracted.productName || null,
      form: extracted.form || null,
      category: extracted.category || null,
      analysis: {
        npks: extracted.npks || { n: 0, p: 0, k: 0, s: 0 },
        micros: extracted.micros,
        carbonSources: extracted.carbonSources,
        biology: extracted.biology,
        densityLbsPerGal: extracted.densityLbsPerGal,
        approvedUses: extracted.approvedUses || [],
        extractionConfidence: extracted.extractionConfidence || 'medium',
        extractedAt: new Date().toISOString(),
        sourceUrl: url,
      },
      activeIngredients: extracted.activeIngredients || null,
      generalNotes: extracted.generalNotes || null,
      suggestedRoles: extracted.suggestedRoles || [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in scrape-product-url function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
