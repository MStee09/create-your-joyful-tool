import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Field, SoilType } from '@/types/field';
import { createDefaultField, SOIL_TYPE_LABELS } from '@/types/field';
import { parseCsv } from '@/lib/csv';

interface FieldImportModalProps {
  onImport: (fields: Field[]) => Promise<void>;
  onClose: () => void;
}

interface ParsedFieldRow {
  name: string;
  acres: number;
  farm?: string;
  soilType?: SoilType;
  pH?: number;
  organicMatter?: number;
  cec?: number;
  isValid: boolean;
  error?: string;
}

// Column name variations we accept
const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['field name', 'name', 'field_name', 'fieldname', 'field'],
  acres: ['acres', 'total acres', 'total_acres', 'size', 'area'],
  farm: ['farm', 'farm name', 'farm_name', 'farmname', 'operation'],
  soilType: ['soil type', 'soil_type', 'soiltype', 'soil'],
  pH: ['ph', 'soil ph', 'soil_ph'],
  organicMatter: ['om%', 'om', 'organic matter', 'organic_matter', 'organicmatter', 'om %'],
  cec: ['cec', 'cation exchange', 'cation_exchange'],
};

// Map soil type string to our enum
function parseSoilType(value: string): SoilType | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();
  
  const mappings: Record<string, SoilType> = {
    'sandy': 'sandy',
    'sand': 'sandy',
    'sandy loam': 'sandy-loam',
    'sandy-loam': 'sandy-loam',
    'loam': 'loam',
    'silt loam': 'silt-loam',
    'silt-loam': 'silt-loam',
    'siltloam': 'silt-loam',
    'clay loam': 'clay-loam',
    'clay-loam': 'clay-loam',
    'clayloam': 'clay-loam',
    'clay': 'clay',
    'heavy clay': 'heavy-clay',
    'heavy-clay': 'heavy-clay',
    'heavyclay': 'heavy-clay',
    'organic': 'organic',
    'organic/muck': 'organic',
    'muck': 'organic',
  };
  
  return mappings[lower];
}

function findColumn(headers: string[], targetField: string): number {
  const variations = COLUMN_MAPPINGS[targetField] || [targetField];
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const variation of variations) {
    const index = lowerHeaders.indexOf(variation.toLowerCase());
    if (index !== -1) return index;
  }
  return -1;
}

function parseNumber(value: string): number | undefined {
  if (!value || value === '' || value === '-') return undefined;
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}

export const FieldImportModal: React.FC<FieldImportModalProps> = ({
  onImport,
  onClose,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedFieldRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, rows: dataRows } = parseCsv(text);
        
        if (dataRows.length === 0) {
          setParseError('File appears to be empty or has no data rows');
          return;
        }

        // Find column indices using normalized headers
        const findCol = (target: string): string | undefined => {
          const variations = COLUMN_MAPPINGS[target] || [target];
          for (const variation of variations) {
            const normalized = variation.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
            if (headers.includes(normalized)) return normalized;
          }
          return undefined;
        };

        const nameCol = findCol('name');
        const acresCol = findCol('acres');
        
        if (!nameCol) {
          setParseError('Could not find "Field Name" or "Name" column');
          return;
        }
        if (!acresCol) {
          setParseError('Could not find "Acres" column');
          return;
        }

        const farmCol = findCol('farm');
        const soilCol = findCol('soilType');
        const phCol = findCol('pH');
        const omCol = findCol('organicMatter');
        const cecCol = findCol('cec');

        const parsed: ParsedFieldRow[] = [];
        
        for (const row of dataRows) {
          const name = nameCol ? (row[nameCol] || '').trim() : '';
          const acresStr = acresCol ? (row[acresCol] || '').trim() : '';
          const acres = parseNumber(acresStr);

          if (!name) {
            parsed.push({
              name: '',
              acres: 0,
              isValid: false,
              error: 'Missing field name',
            });
            continue;
          }

          if (acres === undefined || acres <= 0) {
            parsed.push({
              name,
              acres: 0,
              isValid: false,
              error: 'Invalid or missing acres',
            });
            continue;
          }

          parsed.push({
            name,
            acres,
            farm: farmCol ? row[farmCol]?.trim() || undefined : undefined,
            soilType: soilCol ? parseSoilType(row[soilCol] || '') : undefined,
            pH: phCol ? parseNumber(row[phCol] || '') : undefined,
            organicMatter: omCol ? parseNumber(row[omCol] || '') : undefined,
            cec: cecCol ? parseNumber(row[cecCol] || '') : undefined,
            isValid: true,
          });
        }

        if (parsed.length === 0) {
          setParseError('No valid rows found in file');
          return;
        }

        setParsedRows(parsed);
      } catch (err) {
        setParseError('Failed to parse file. Make sure it is a valid CSV.');
        console.error(err);
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);

  const handleImport = async () => {
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const fields: Field[] = validRows.map(row => 
        createDefaultField({
          name: row.name,
          acres: row.acres,
          farm: row.farm,
          soilType: row.soilType,
          pH: row.pH,
          organicMatter: row.organicMatter,
          cec: row.cec,
        })
      );
      await onImport(fields);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Fields</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {parsedRows.length === 0 ? (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                `}
              >
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">
                  Drag & drop a CSV file here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <Button variant="outline" asChild>
                  <label htmlFor="file-input" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Select File
                  </label>
                </Button>
              </div>

              {/* Expected columns */}
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Expected columns:</p>
                <p>Field Name*, Acres*, Farm, Soil Type, pH, OM%, CEC</p>
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-foreground font-medium">
                  {validRows.length} fields ready to import
                </span>
                {invalidRows.length > 0 && (
                  <span className="text-destructive">
                    {invalidRows.length} rows with errors
                  </span>
                )}
              </div>

              {invalidRows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {invalidRows.length} row(s) will be skipped due to errors.
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Field Name</TableHead>
                      <TableHead className="text-right">Acres</TableHead>
                      <TableHead>Farm</TableHead>
                      <TableHead>Soil Type</TableHead>
                      <TableHead className="text-right">pH</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 10).map((row, i) => (
                      <TableRow key={i} className={row.isValid ? '' : 'bg-destructive/10'}>
                        <TableCell>
                          {row.isValid ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.name || <span className="text-destructive">Missing</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.acres > 0 ? row.acres : <span className="text-destructive">Invalid</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.farm || '—'}</TableCell>
                        <TableCell>
                          {row.soilType ? SOIL_TYPE_LABELS[row.soilType] : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.pH?.toFixed(1) || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedRows.length > 10 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/50">
                    ... and {parsedRows.length - 10} more rows
                  </div>
                )}
              </div>
            </>
          )}

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {parsedRows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importing}
            >
              {importing ? 'Importing...' : `Import ${validRows.length} Fields`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
