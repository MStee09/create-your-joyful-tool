import React, { useMemo, useState } from 'react';
import { BookOpen, Award, Calendar, Building2, Package, ArrowUpDown, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import type { PriceBookEntry, ProductMaster, Vendor, BidEvent, CommoditySpec } from '@/types';
import { formatCurrency } from '@/utils/farmUtils';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface PriceBookViewProps {
  priceBook: PriceBookEntry[];
  productMasters: ProductMaster[];
  vendors: Vendor[];
  bidEvents: BidEvent[];
  commoditySpecs: CommoditySpec[];
  currentSeasonYear: number;
}

type SortField = 'product' | 'price' | 'vendor' | 'source' | 'season';
type SortOrder = 'asc' | 'desc';

export const PriceBookView: React.FC<PriceBookViewProps> = ({
  priceBook,
  productMasters,
  vendors,
  bidEvents,
  commoditySpecs,
  currentSeasonYear,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeason, setFilterSeason] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('season');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set([currentSeasonYear]));

  // Get unique seasons from price book
  const seasons = useMemo(() => {
    const uniqueSeasons = [...new Set(priceBook.map(e => e.seasonYear))];
    return uniqueSeasons.sort((a, b) => b - a);
  }, [priceBook]);

  // Enrich price book entries with product, vendor, and bid event info
  const enrichedEntries = useMemo(() => {
    return priceBook.map(entry => {
      const product = productMasters.find(p => p.id === entry.productId);
      const spec = commoditySpecs.find(s => s.id === entry.specId);
      const vendor = entry.vendorId ? vendors.find(v => v.id === entry.vendorId) : null;
      
      // Find the bid event that created this award (if awarded)
      let bidEvent: BidEvent | null = null;
      if (entry.source === 'awarded') {
        // Look for bid events in the same season
        bidEvent = bidEvents.find(e => 
          e.seasonYear === entry.seasonYear && 
          e.status === 'awarded' || e.status === 'locked'
        ) || null;
      }

      return {
        ...entry,
        productName: product?.name || spec?.specName || 'Unknown Product',
        specName: spec?.specName,
        vendorName: vendor?.name || 'N/A',
        bidEventName: bidEvent?.name,
        bidEventType: bidEvent?.eventType,
      };
    });
  }, [priceBook, productMasters, commoditySpecs, vendors, bidEvents]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = enrichedEntries;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.productName.toLowerCase().includes(query) ||
        e.vendorName.toLowerCase().includes(query) ||
        e.specName?.toLowerCase().includes(query)
      );
    }

    // Filter by season
    if (filterSeason !== 'all') {
      result = result.filter(e => e.seasonYear === parseInt(filterSeason));
    }

    // Filter by source
    if (filterSource !== 'all') {
      result = result.filter(e => e.source === filterSource);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'product':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'vendor':
          comparison = a.vendorName.localeCompare(b.vendorName);
          break;
        case 'source':
          comparison = a.source.localeCompare(b.source);
          break;
        case 'season':
          comparison = a.seasonYear - b.seasonYear;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [enrichedEntries, searchQuery, filterSeason, filterSource, sortField, sortOrder]);

  // Group entries by season for accordion view
  const entriesBySeason = useMemo(() => {
    const grouped: Record<number, typeof filteredEntries> = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.seasonYear]) {
        grouped[entry.seasonYear] = [];
      }
      grouped[entry.seasonYear].push(entry);
    });
    return grouped;
  }, [filteredEntries]);

  const toggleSeason = (year: number) => {
    setExpandedSeasons(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSourceBadge = (source: PriceBookEntry['source']) => {
    switch (source) {
      case 'awarded':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-600 rounded-full text-xs font-medium">
            <Award className="w-3 h-3" />
            Awarded
          </span>
        );
      case 'manual_override':
        return (
          <span className="px-2 py-0.5 bg-blue-500/15 text-blue-600 rounded-full text-xs font-medium">
            Manual
          </span>
        );
      case 'estimated':
        return (
          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
            Estimated
          </span>
        );
    }
  };

  // Stats
  const stats = useMemo(() => {
    const currentSeasonEntries = priceBook.filter(e => e.seasonYear === currentSeasonYear);
    const awardedCount = currentSeasonEntries.filter(e => e.source === 'awarded').length;
    const totalValue = currentSeasonEntries.reduce((sum, e) => sum + e.price, 0);
    
    return {
      totalEntries: priceBook.length,
      currentSeasonEntries: currentSeasonEntries.length,
      awardedCount,
      uniqueVendors: new Set(priceBook.filter(e => e.vendorId).map(e => e.vendorId)).size,
    };
  }, [priceBook, currentSeasonYear]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" />
            Price Book
          </h1>
          <p className="text-muted-foreground mt-1">
            Historical awarded prices and cost references by season
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalEntries}</p>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.awardedCount}</p>
              <p className="text-sm text-muted-foreground">Awarded ({currentSeasonYear})</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{seasons.length}</p>
              <p className="text-sm text-muted-foreground">Seasons Tracked</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.uniqueVendors}</p>
              <p className="text-sm text-muted-foreground">Vendors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products or vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSeason} onValueChange={setFilterSeason}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
            <SelectItem value="manual_override">Manual</SelectItem>
            <SelectItem value="estimated">Estimated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Book Table - Grouped by Season */}
      {priceBook.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Price Book Entries</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Price book entries are created when you award bids in the Bid Events section. 
            These prices will automatically flow into your crop plan cost calculations.
          </p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Filter className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Matching Entries</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(entriesBySeason)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, entries]) => {
              const yearNum = parseInt(year);
              const isExpanded = expandedSeasons.has(yearNum);
              const awardedInSeason = entries.filter(e => e.source === 'awarded').length;
              
              return (
                <div key={year} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Season Header */}
                  <button
                    onClick={() => toggleSeason(yearNum)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-lg text-foreground">{year} Season</span>
                      </div>
                      {yearNum === currentSeasonYear && (
                        <span className="px-2 py-0.5 bg-primary/15 text-primary rounded-full text-xs font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{entries.length} entries</span>
                      {awardedInSeason > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Award className="w-4 h-4" />
                          {awardedInSeason} awarded
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Season Entries Table */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead 
                              className="cursor-pointer hover:text-foreground"
                              onClick={() => handleSort('product')}
                            >
                              <div className="flex items-center gap-1">
                                Product / Spec
                                {sortField === 'product' && (
                                  <ArrowUpDown className="w-3 h-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:text-foreground"
                              onClick={() => handleSort('vendor')}
                            >
                              <div className="flex items-center gap-1">
                                Vendor
                                {sortField === 'vendor' && (
                                  <ArrowUpDown className="w-3 h-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:text-foreground text-right"
                              onClick={() => handleSort('price')}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Price
                                {sortField === 'price' && (
                                  <ArrowUpDown className="w-3 h-3" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Bid Event</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map(entry => (
                            <TableRow key={entry.id} className="hover:bg-muted/20">
                              <TableCell>
                                <div>
                                  <p className="font-medium text-foreground">{entry.productName}</p>
                                  {entry.specName && entry.specName !== entry.productName && (
                                    <p className="text-xs text-muted-foreground">{entry.specName}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <span>{entry.vendorName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-semibold text-primary">
                                  {formatCurrency(entry.price)}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  /{entry.priceUom}
                                </span>
                              </TableCell>
                              <TableCell>
                                {getSourceBadge(entry.source)}
                              </TableCell>
                              <TableCell>
                                {entry.bidEventName ? (
                                  <span className="text-sm text-muted-foreground">
                                    {entry.bidEventName}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground/50">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
