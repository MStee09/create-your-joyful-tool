import React, { useState } from 'react';
import { Clock, X, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ApplicationTiming, CropType, TimingBucket } from '@/types/farm';
import { TIMING_BUCKET_INFO, GROWTH_STAGES, getTimingDisplayText, normalizeCropType } from '@/lib/growthStages';
import { cn } from '@/lib/utils';

interface TimingEditorPopoverProps {
  timing: ApplicationTiming;
  cropType?: CropType;
  onUpdate: (timing: ApplicationTiming) => void;
  children?: React.ReactNode;
}

export const TimingEditorPopover: React.FC<TimingEditorPopoverProps> = ({
  timing,
  cropType = 'corn',
  onUpdate,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [bucket, setBucket] = useState<TimingBucket>(timing.timingBucket || 'IN_SEASON');
  const [stageStart, setStageStart] = useState(timing.growthStageStart || '');
  const [stageEnd, setStageEnd] = useState(timing.growthStageEnd || '');

  const normalizedCropType = normalizeCropType(cropType);
  const stages = GROWTH_STAGES[normalizedCropType];

  const handleBucketChange = (newBucket: TimingBucket) => {
    setBucket(newBucket);
    if (newBucket !== 'IN_SEASON') {
      setStageStart('');
      setStageEnd('');
    }
  };

  const handleSave = () => {
    onUpdate({
      ...timing,
      timingBucket: bucket,
      growthStageStart: bucket === 'IN_SEASON' ? stageStart || undefined : undefined,
      growthStageEnd: bucket === 'IN_SEASON' && stageEnd ? stageEnd : undefined,
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <button
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title="Edit timing"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">Pass Timing</h4>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timing Bucket Selector */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">When does this pass happen?</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TIMING_BUCKET_INFO) as TimingBucket[]).map((b) => (
                <button
                  key={b}
                  onClick={() => handleBucketChange(b)}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg border transition-colors text-left',
                    bucket === b
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  )}
                >
                  {TIMING_BUCKET_INFO[b].label}
                </button>
              ))}
            </div>
          </div>

          {/* Growth Stage Selector (only for IN_SEASON) */}
          {bucket === 'IN_SEASON' && (
            <div className="space-y-3 pt-2 border-t border-border">
              <label className="text-sm text-muted-foreground">Growth Stage</label>
              
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select value={stageStart} onValueChange={setStageStart}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Start stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(({ stage, description }) => (
                        <SelectItem key={stage} value={stage}>
                          <span className="font-medium">{stage}</span>
                          <span className="text-muted-foreground ml-2">- {description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1">
                  <Select 
                    value={stageEnd || '__none__'} 
                    onValueChange={(v) => setStageEnd(v === '__none__' ? '' : v)}
                    disabled={!stageStart}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="End (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None (single stage)</SelectItem>
                      {stages
                        .filter(({ stage }) => {
                          if (!stageStart) return true;
                          const startOrder = stages.find(s => s.stage === stageStart)?.order ?? 0;
                          const currentOrder = stages.find(s => s.stage === stage)?.order ?? 0;
                          return currentOrder > startOrder;
                        })
                        .map(({ stage, description }) => (
                          <SelectItem key={stage} value={stage}>
                            <span className="font-medium">{stage}</span>
                            <span className="text-muted-foreground ml-2">- {description}</span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {stageStart && (
                <p className="text-xs text-muted-foreground">
                  Will display as: <span className="text-foreground font-medium">
                    {getTimingDisplayText(bucket, stageStart, stageEnd)}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Save Timing
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
