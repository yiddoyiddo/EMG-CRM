'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FunnelStage {
  name: string;
  value: number;
  color: string;
  conversionRate?: number;
}

interface FunnelChartProps {
  data: FunnelStage[];
  className?: string;
}

export function ResponsiveFunnelChart({ data, className = '' }: FunnelChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: Math.max(400, rect.height)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const { width, height } = dimensions;
  
  // Calculate the maximum value for scaling
  const maxValue = Math.max(...data.map(d => d.value));
  
  // Calculate funnel dimensions
  const funnelWidth = width * 0.8;
  const funnelHeight = height * 0.7;
  const stageHeight = funnelHeight / data.length;
  const centerX = width / 2;
  
  // Calculate conversion rates
  const stagesWithRates = data.map((stage, index) => {
    const nextStage = data[index + 1];
    const conversionRate = nextStage ? ((nextStage.value / stage.value) * 100) : null;
    return { ...stage, conversionRate };
  });

  return (
    <div ref={containerRef} className={`w-full h-96 ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        {stagesWithRates.map((stage, index) => {
          // Calculate funnel shape for this stage
          const progress = index / (data.length - 1);
          const stageWidth = funnelWidth * (1 - progress * 0.6); // Funnel gets narrower
          const y = (height - funnelHeight) / 2 + index * stageHeight;
          
          return (
            <g key={stage.name}>
              {/* Funnel segment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <rect
                    x={centerX - stageWidth / 2}
                    y={y}
                    width={stageWidth}
                    height={stageHeight - 4}
                    rx={8}
                    fill={stage.color}
                    fillOpacity="0.8"
                    className="cursor-pointer transition-all hover:opacity-100"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.2"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">{stage.name}</p>
                    <p>Count: {stage.value.toLocaleString()}</p>
                    {stage.conversionRate !== null && (
                      <p>Conversion: {stage.conversionRate.toFixed(1)}%</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              
              {/* Stage label */}
              <text
                x={centerX}
                y={y + stageHeight / 2 + 4}
                textAnchor="middle"
                className="text-xs font-medium fill-foreground"
              >
                {stage.name}
              </text>
              
              {/* Value label */}
              <text
                x={centerX}
                y={y + stageHeight / 2 - 8}
                textAnchor="middle"
                className="text-sm font-bold fill-foreground"
              >
                {stage.value.toLocaleString()}
              </text>
              
              {/* Conversion rate indicator */}
              {stage.conversionRate !== null && (
                <g>
                  <line
                    x1={centerX + stageWidth / 2 + 10}
                    y1={y + stageHeight / 2}
                    x2={centerX + stageWidth / 2 + 30}
                    y2={y + stageHeight / 2}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeOpacity="0.4"
                  />
                  <text
                    x={centerX + stageWidth / 2 + 35}
                    y={y + stageHeight / 2 + 4}
                    className="text-xs fill-muted-foreground"
                  >
                    {stage.conversionRate.toFixed(1)}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-xs text-muted-foreground">
        {data.map((stage, index) => (
          <div key={stage.name} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: stage.color }}
            />
            <span>{stage.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 