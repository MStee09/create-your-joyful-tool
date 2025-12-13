import { useState, useCallback } from 'react';
import type { ProductAnalysis, ProductPurpose, LabelExtractionResult, ApplicationOverride } from '@/types/productIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductIntelligenceState {
  analyses: Record<string, ProductAnalysis>;
  purposes: Record<string, ProductPurpose>;
  applicationOverrides: Record<string, ApplicationOverride>;
}

const STORAGE_KEY = 'farmcalc-product-intelligence';

export const useProductIntelligence = () => {
  const [state, setState] = useState<ProductIntelligenceState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        console.error('Failed to parse product intelligence state');
      }
    }
    return { analyses: {}, purposes: {}, applicationOverrides: {} };
  });

  const [isExtracting, setIsExtracting] = useState(false);

  // Save to localStorage whenever state changes
  const saveState = useCallback((newState: ProductIntelligenceState) => {
    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  // Extract analysis from label
  const extractFromLabel = useCallback(async (
    productId: string,
    labelBase64: string,
    fileName: string
  ): Promise<LabelExtractionResult | null> => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-label', {
        body: { labelBase64, fileName },
      });

      if (error) throw error;
      return data as LabelExtractionResult;
    } catch (error) {
      console.error('Label extraction failed:', error);
      toast.error('Failed to extract label data. Please try again.');
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  // Save confirmed analysis
  const saveAnalysis = useCallback((productId: string, analysis: ProductAnalysis) => {
    const newState = {
      ...state,
      analyses: {
        ...state.analyses,
        [productId]: analysis,
      },
    };
    saveState(newState);
    toast.success('Product analysis saved');
  }, [state, saveState]);

  // Get analysis for a product
  const getAnalysis = useCallback((productId: string): ProductAnalysis | null => {
    return state.analyses[productId] || null;
  }, [state.analyses]);

  // Save purpose
  const savePurpose = useCallback((productId: string, purpose: ProductPurpose) => {
    const newState = {
      ...state,
      purposes: {
        ...state.purposes,
        [productId]: { ...purpose, productId },
      },
    };
    saveState(newState);
  }, [state, saveState]);

  // Get purpose for a product
  const getPurpose = useCallback((productId: string): ProductPurpose | null => {
    return state.purposes[productId] || null;
  }, [state.purposes]);

  // Save application override (pass-level "why")
  const saveApplicationOverride = useCallback((applicationId: string, override: ApplicationOverride) => {
    const newState = {
      ...state,
      applicationOverrides: {
        ...state.applicationOverrides,
        [applicationId]: override,
      },
    };
    saveState(newState);
  }, [state, saveState]);

  // Get application override
  const getApplicationOverride = useCallback((applicationId: string): ApplicationOverride | null => {
    return state.applicationOverrides[applicationId] || null;
  }, [state.applicationOverrides]);

  return {
    // State
    analyses: state.analyses,
    purposes: state.purposes,
    applicationOverrides: state.applicationOverrides,
    isExtracting,

    // Actions
    extractFromLabel,
    saveAnalysis,
    getAnalysis,
    savePurpose,
    getPurpose,
    saveApplicationOverride,
    getApplicationOverride,
  };
};
