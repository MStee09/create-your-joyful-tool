-- Add chemical product data columns to product_masters
-- For herbicides, fungicides, insecticides: restrictions, PHI, rotation, max rates, mixing order

ALTER TABLE product_masters
ADD COLUMN IF NOT EXISTS chemical_data JSONB DEFAULT NULL;

-- The chemical_data JSONB will store:
-- {
--   "activeIngredients": [
--     { "name": "Glyphosate", "concentration": "41%", "unit": "ae", "chemicalClass": "amino acid synthesis inhibitor" }
--   ],
--   "restrictions": {
--     "phiDays": 14,
--     "rotationRestrictions": [
--       { "crop": "Soybeans", "days": 30, "notes": "Do not plant within 30 days" }
--     ],
--     "maxRatePerSeason": { "value": 128, "unit": "oz/ac" },
--     "maxRatePerApplication": { "value": 32, "unit": "oz/ac" },
--     "maxApplicationsPerSeason": 4,
--     "reiHours": 12,
--     "bufferZoneFeet": 25
--   },
--   "mixingOrder": {
--     "priority": 3,
--     "category": "herbicide",
--     "notes": "Add after water conditioners, before adjuvants"
--   },
--   "compatibility": {
--     "antagonists": ["2,4-D ester", "dicamba"],
--     "synergists": ["AMS"],
--     "notes": "Do not mix with ester formulations"
--   },
--   "signalWord": "caution",
--   "epaRegNumber": "524-445"
-- }

COMMENT ON COLUMN product_masters.chemical_data IS 'Pesticide-specific data: active ingredients, PHI, rotation restrictions, max rates, mixing order, compatibility';