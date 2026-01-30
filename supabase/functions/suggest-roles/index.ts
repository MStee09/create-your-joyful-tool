import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ROLE_SUGGESTION_PROMPT = `You are an agronomist classifying crop input products by their functional roles.

Given a product's name, category, analysis (NPK-S), and active ingredients, determine which functional roles apply.

Available roles (return ONLY these exact strings):
- "fertility-macro" - Primary NPK source (N>5 or P>5 or K>5)
- "fertility-micro" - Micronutrient source (Zn, Mn, Fe, B, Cu, Mo, etc.)
- "biostimulant" - Plant hormones, seaweed extracts, humic/fulvic acids
- "carbon-biology-food" - Carbon sources that feed soil biology (sugars, molasses, humates)
- "stress-mitigation" - Products that help plants handle stress (osmoprotectants, antioxidants)
- "uptake-translocation" - Products that improve nutrient movement (chelators, surfactants for foliar)
- "nitrogen-conversion" - Products that improve N efficiency (nitrification inhibitors, urease inhibitors)
- "rooting-vigor" - Products that promote root growth (IBA, phosphorus, seaweed)
- "water-conditioning" - AMS, water pH buffers, hard water conditioners
- "adjuvant" - Surfactants, stickers, drift retardants, compatibility agents

Classification rules:
1. A product can have multiple roles (usually 1-3)
2. Base classification on the primary function, not minor ingredients
3. Category provides strong hints:
   - "fertilizer-liquid" or "fertilizer-dry" → likely fertility-macro
   - "biological" → likely biostimulant or carbon-biology-food
   - "micronutrient" → fertility-micro
   - "adjuvant" → adjuvant
   - "seed-treatment" → often rooting-vigor
4. NPK analysis:
   - High N (>10%) → fertility-macro, possibly nitrogen-conversion
   - High P (>10%) → fertility-macro, often rooting-vigor
   - Balanced low NPK with organics → biostimulant
5. Active ingredients:
   - Humic/fulvic acid → biostimulant, carbon-biology-food
   - Seaweed/kelp → biostimulant, rooting-vigor
   - Chelated micros → fertility-micro, uptake-translocation
   - Amino acids → stress-mitigation, biostimulant

For EACH role you assign, you MUST provide:
1. confidence: "high", "medium", or "low"
   - high: Clear match based on NPK analysis or explicit product claims
   - medium: Reasonable inference from category or ingredients
   - low: Possible role based on context, needs human verification
2. explanation: One sentence explaining why this role applies
3. evidence: 1-3 bullet points of specific facts from the provided data that support this role

Return a JSON object with this structure:
{
  "suggestions": [
    {
      "role": "fertility-macro",
      "confidence": "high",
      "explanation": "Contains 10-34-0 NPK, a high-phosphorus starter fertilizer",
      "evidence": ["P content of 34% exceeds 10% threshold", "Classified as fertilizer-liquid"]
    }
  ],
  "sourceInfo": "Based on product name, category, and NPK analysis"
}

Return ONLY the JSON object, no additional text.`;

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

    const { productName, category, analysis, activeIngredients } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const contextParts = [];
    
    if (productName) {
      contextParts.push(`Product Name: ${productName}`);
    }
    
    if (category) {
      contextParts.push(`Category: ${category}`);
    }
    
    if (analysis) {
      contextParts.push(`NPK-S Analysis: N=${analysis.n || 0}, P=${analysis.p || 0}, K=${analysis.k || 0}, S=${analysis.s || 0}`);
    }
    
    if (activeIngredients) {
      contextParts.push(`Active Ingredients: ${activeIngredients}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: ROLE_SUGGESTION_PROMPT },
          { role: 'user', content: contextParts.join('\n') }
        ],
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

    // Parse JSON from response (handle markdown code blocks)
    let responseData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse role suggestions');
    }

    // Validate roles
    const validRoles = [
      'fertility-macro', 'fertility-micro', 'biostimulant', 
      'carbon-biology-food', 'stress-mitigation', 'uptake-translocation',
      'nitrogen-conversion', 'rooting-vigor', 'water-conditioning', 'adjuvant'
    ];
    
    const validConfidences = ['high', 'medium', 'low'];
    
    // Handle new format with suggestions array
    if (responseData.suggestions && Array.isArray(responseData.suggestions)) {
      const suggestions = responseData.suggestions
        .filter((s: any) => validRoles.includes(s.role))
        .map((s: any) => ({
          role: s.role,
          confidence: validConfidences.includes(s.confidence) ? s.confidence : 'medium',
          explanation: s.explanation || 'No explanation provided',
          evidence: Array.isArray(s.evidence) ? s.evidence : [],
        }));

      return new Response(JSON.stringify({ 
        suggestions,
        sourceInfo: responseData.sourceInfo || 'Based on provided product information',
        analyzedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Fallback for legacy format (just roles array)
    const roles = (responseData.roles || []).filter((r: string) => validRoles.includes(r));
    const legacySuggestions = roles.map((role: string) => ({
      role,
      confidence: 'medium' as const,
      explanation: 'Role suggested based on product analysis',
      evidence: [],
    }));

    return new Response(JSON.stringify({ 
      suggestions: legacySuggestions,
      sourceInfo: 'Based on provided product information',
      analyzedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in suggest-roles function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, roles: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
