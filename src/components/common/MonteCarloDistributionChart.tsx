import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { MonteCarloScenario } from '../../types';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Maximize2,
  Sparkles,
  Info,
  Layers,
  Flame,
} from 'lucide-react';

interface MonteCarloDistributionChartProps {
  scenario: MonteCarloScenario;
  onSimulateAgain?: () => void;
}

type VisualizationMode = 'density' | 'cdf' | 'trajectories';

export const MonteCarloDistributionChart: React.FC<MonteCarloDistributionChartProps> = ({
  scenario,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 680, height: 320 });
  const [viewMode, setViewMode] = useState<VisualizationMode>('density');
  const [hoveredData, setHoveredData] = useState<{
    score: number;
    density?: number;
    count?: number;
    cdfPct?: number;
    probGreater?: number;
    xPos: number;
    yPos: number;
  } | null>(null);

  // ResizeObserver for responsive SVG dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: Math.max(320, entry.contentRect.width),
            height: Math.min(360, Math.max(260, entry.contentRect.width * 0.42)),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const outcomes = scenario.finalOutcomes || [];
  const iterations = scenario.iterations || outcomes.length || 1000;

  // Statistical aggregates
  const stats = useMemo(() => {
    if (!outcomes.length) {
      return {
        mean: scenario.expectedFinalScore || 70,
        median: scenario.expectedFinalScore || 70,
        stdDev: 4.5,
        p10: 62,
        p25: 66,
        p50: 70,
        p75: 74,
        p90: 78,
        p01: 58,
        p99: 84,
        probElite: scenario.successRate || 0,
        min: 50,
        max: 90,
      };
    }
    const sorted = [...outcomes].sort((a, b) => a - b);
    const mean = d3.mean(sorted) ?? 0;
    const stdDev = d3.deviation(sorted) ?? 0;
    const p10 = d3.quantile(sorted, 0.10) ?? 0;
    const p25 = d3.quantile(sorted, 0.25) ?? 0;
    const p50 = d3.quantile(sorted, 0.50) ?? 0;
    const p75 = d3.quantile(sorted, 0.75) ?? 0;
    const p90 = d3.quantile(sorted, 0.90) ?? 0;
    const p01 = d3.quantile(sorted, 0.01) ?? 0;
    const p99 = d3.quantile(sorted, 0.99) ?? 0;
    const countElite = sorted.filter(v => v >= scenario.targetComposite).length;
    const probElite = Math.round((countElite / sorted.length) * 100);

    return {
      mean: Number(mean.toFixed(1)),
      median: Number(p50.toFixed(1)),
      stdDev: Number(stdDev.toFixed(1)),
      p10: Number(p10.toFixed(1)),
      p25: Number(p25.toFixed(1)),
      p50: Number(p50.toFixed(1)),
      p75: Number(p75.toFixed(1)),
      p90: Number(p90.toFixed(1)),
      p01: Number(p01.toFixed(1)),
      p99: Number(p99.toFixed(1)),
      probElite,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }, [outcomes, scenario.expectedFinalScore, scenario.successRate, scenario.targetComposite]);

  // Main D3 Drawing Effect
  useEffect(() => {
    if (!svgRef.current || outcomes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 28, right: 32, bottom: 42, left: 46 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradient definitions
    const defs = svg.append('defs');

    // Density Gradient
    const densityGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-density-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    densityGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.65);
    densityGrad.append('stop').attr('offset', '60%').attr('stop-color', 'var(--md-sys-color-primary)').attr('stop-opacity', 0.25);
    densityGrad.append('stop').attr('offset', '100%').attr('stop-color', 'var(--md-sys-color-primary)').attr('stop-opacity', 0.02);

    // Elite Zone Gradient
    const eliteGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-elite-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    eliteGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.05);
    eliteGrad.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.15);

    // ==========================================
    // 1. PROBABILITY DENSITY MODE (KDE + BINS)
    // ==========================================
    if (viewMode === 'density') {
      const minX = Math.max(25, Math.floor(stats.p01 - 3));
      const maxX = Math.min(100, Math.ceil(stats.p99 + 3));

      const xScale = d3.scaleLinear().domain([minX, maxX]).range([0, innerWidth]).nice();

      // Histogram bins
      const binGenerator = d3
        .bin<number, number>()
        .domain(xScale.domain() as [number, number])
        .thresholds(xScale.ticks(28));

      const bins = binGenerator(outcomes);
      const maxBinCount = d3.max(bins, d => d.length) || 1;

      // Kernel Density Estimation (Gaussian)
      function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
        return (V: number[]) => {
          return X.map(x => [x, d3.mean(V, v => kernel(x - v)) || 0] as [number, number]);
        };
      }
      function kernelEpanechnikov(k: number) {
        return (v: number) => {
          const u = v / k;
          return Math.abs(u) <= 1 ? (0.75 * (1 - u * u)) / k : 0;
        };
      }

      const bandwidth = Math.max(1.2, stats.stdDev * 0.45);
      const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xScale.ticks(100));
      const densityData = kde(outcomes);
      const maxDensity = d3.max(densityData, d => d[1]) || 0.01;

      const yScale = d3.scaleLinear().domain([0, maxDensity * 1.15]).range([innerHeight, 0]);
      const yBinScale = d3.scaleLinear().domain([0, maxBinCount * 1.15]).range([innerHeight, 0]);

      // Gridlines
      g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.15)
        .call(
          d3.axisLeft(yScale)
            .ticks(4)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .attr('stroke', 'var(--md-sys-color-outline-variant)');

      // Highlight Elite Zone (>= 82)
      const eliteX = xScale(scenario.targetComposite);
      if (eliteX < innerWidth) {
        g.append('rect')
          .attr('x', Math.max(0, eliteX))
          .attr('y', 0)
          .attr('width', Math.max(0, innerWidth - Math.max(0, eliteX)))
          .attr('height', innerHeight)
          .attr('fill', 'url(#d3-elite-grad)')
          .attr('rx', 4);

        g.append('text')
          .attr('x', innerWidth - 6)
          .attr('y', 14)
          .attr('text-anchor', 'end')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .attr('fill', '#10b981')
          .text(`ELITE ZONE (≥${scenario.targetComposite} OVR)`);
      }

      // Draw Histogram Frequency Bins
      const barG = g.append('g').attr('class', 'histogram-bars');
      barG
        .selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.x0 ?? 0) + 1)
        .attr('width', d => Math.max(0, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1.5))
        .attr('y', d => yBinScale(d.length))
        .attr('height', d => Math.max(0, innerHeight - yBinScale(d.length)))
        .attr('fill', d => {
          const mid = ((d.x0 ?? 0) + (d.x1 ?? 0)) / 2;
          if (mid >= scenario.targetComposite) return '#10b981';
          if (mid >= stats.median) return 'var(--md-sys-color-primary)';
          return 'var(--md-sys-color-outline-variant)';
        })
        .attr('opacity', 0.28)
        .attr('rx', 2);

      // Area under Density Curve
      const area = d3
        .area<[number, number]>()
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d[0]))
        .y0(innerHeight)
        .y1(d => yScale(d[1]));

      g.append('path')
        .datum(densityData)
        .attr('fill', 'url(#d3-density-grad)')
        .attr('d', area);

      // Density Line
      const line = d3
        .line<[number, number]>()
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));

      g.append('path')
        .datum(densityData)
        .attr('fill', 'none')
        .attr('stroke', 'var(--md-sys-color-primary)')
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // Vertical Milestone Reference Lines
      const markers = [
        { label: 'P10 Bear', value: stats.p10, color: '#f43f5e', dash: '4 3' },
        { label: `P50 Med (${stats.median})`, value: stats.median, color: 'var(--md-sys-color-primary)', dash: 'none', bold: true },
        { label: 'P90 Bull', value: stats.p90, color: '#10b981', dash: '4 3' },
      ];

      markers.forEach(m => {
        const xPos = xScale(m.value);
        if (xPos >= 0 && xPos <= innerWidth) {
          g.append('line')
            .attr('x1', xPos)
            .attr('y1', 0)
            .attr('x2', xPos)
            .attr('y2', innerHeight)
            .attr('stroke', m.color)
            .attr('stroke-width', m.bold ? 2 : 1.2)
            .attr('stroke-dasharray', m.dash)
            .attr('opacity', 0.85);

          g.append('text')
            .attr('x', xPos)
            .attr('y', -6)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', m.bold ? '700' : '600')
            .attr('font-family', 'monospace')
            .attr('fill', m.color)
            .text(`${m.label}`);
        }
      });

      // X-Axis
      const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d => `${d}`);
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .attr('color', 'var(--md-sys-color-on-surface-variant)')
        .selectAll('text')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace');

      // Y-Axis
      const yAxis = d3.axisLeft(yBinScale).ticks(4).tickFormat(d => `${d} runs`);
      g.append('g')
        .call(yAxis)
        .attr('color', 'var(--md-sys-color-on-surface-variant)')
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');

      // Interactive Crosshair & Tooltip Overlay
      const crosshair = g.append('g').style('display', 'none');
      const crosshairLine = crosshair
        .append('line')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'var(--md-sys-color-primary)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2 2');

      const crosshairDot = crosshair
        .append('circle')
        .attr('r', 4.5)
        .attr('fill', 'var(--md-sys-color-primary)')
        .attr('stroke', 'var(--md-sys-color-surface)')
        .attr('stroke-width', 2);

      // Transparent Hover Rect
      g.append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .attr('cursor', 'crosshair')
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event);
          const scoreVal = xScale.invert(mx);
          const roundedScore = Number(scoreVal.toFixed(1));

          // Interpolate y from density curve
          const bisect = d3.bisector<[number, number], number>(d => d[0]).center;
          const idx = Math.min(densityData.length - 1, Math.max(0, bisect(densityData, roundedScore)));
          const interpolatedDensity = densityData[idx]?.[1] || 0;
          const yPos = yScale(interpolatedDensity);

          crosshair.style('display', null);
          crosshairLine.attr('x1', mx).attr('x2', mx);
          crosshairDot.attr('cx', mx).attr('cy', yPos);

          const countGreater = outcomes.filter(v => v >= roundedScore).length;
          const probGreater = Math.round((countGreater / outcomes.length) * 100);

          setHoveredData({
            score: roundedScore,
            density: Number((interpolatedDensity * 100).toFixed(2)),
            probGreater,
            xPos: mx + margin.left,
            yPos: yPos + margin.top,
          });
        })
        .on('mouseleave', function () {
          crosshair.style('display', 'none');
          setHoveredData(null);
        });
    }

    // ==========================================
    // 2. CUMULATIVE DISTRIBUTION (CDF) MODE
    // ==========================================
    if (viewMode === 'cdf') {
      const sorted = [...outcomes].sort((a, b) => a - b);
      const minX = Math.max(25, Math.floor(stats.p01 - 2));
      const maxX = Math.min(100, Math.ceil(stats.p99 + 2));

      const xScale = d3.scaleLinear().domain([minX, maxX]).range([0, innerWidth]).nice();
      const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

      // Gridlines
      g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.15)
        .call(
          d3.axisLeft(yScale)
            .ticks(5)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .attr('stroke', 'var(--md-sys-color-outline-variant)');

      // Generate CDF curve data
      const cdfData: [number, number][] = [];
      const step = (maxX - minX) / 120;
      for (let x = minX; x <= maxX; x += step) {
        const countLess = sorted.filter(v => v <= x).length;
        const pct = (countLess / sorted.length) * 100;
        cdfData.push([x, pct]);
      }

      // CDF Area
      const cdfArea = d3
        .area<[number, number]>()
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d[0]))
        .y0(innerHeight)
        .y1(d => yScale(d[1]));

      g.append('path')
        .datum(cdfData)
        .attr('fill', 'url(#d3-density-grad)')
        .attr('d', cdfArea);

      // CDF Line
      const cdfLine = d3
        .line<[number, number]>()
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));

      g.append('path')
        .datum(cdfData)
        .attr('fill', 'none')
        .attr('stroke', 'var(--md-sys-color-primary)')
        .attr('stroke-width', 2.5)
        .attr('d', cdfLine);

      // 50% Median Line
      const medY = yScale(50);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', medY)
        .attr('y2', medY)
        .attr('stroke', 'var(--md-sys-color-outline-variant)')
        .attr('stroke-dasharray', '3 3');

      g.append('text')
        .attr('x', innerWidth)
        .attr('y', medY - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('fill', 'var(--md-sys-color-on-surface-variant)')
        .text('50% Probability Midpoint');

      // Target Elite line
      const targetX = xScale(scenario.targetComposite);
      if (targetX <= innerWidth) {
        g.append('line')
          .attr('x1', targetX)
          .attr('x2', targetX)
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#10b981')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4 3');

        g.append('text')
          .attr('x', targetX + 4)
          .attr('y', 14)
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .attr('font-weight', '700')
          .attr('fill', '#10b981')
          .text(`Target ≥${scenario.targetComposite} (${scenario.successRate}% Success)`);
      }

      // X-Axis
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(8))
        .attr('color', 'var(--md-sys-color-on-surface-variant)')
        .selectAll('text')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace');

      // Y-Axis
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}%`))
        .attr('color', 'var(--md-sys-color-on-surface-variant)')
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');

      // Tooltip tracking for CDF
      const crosshair = g.append('g').style('display', 'none');
      const chLine = crosshair
        .append('line')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'var(--md-sys-color-primary)')
        .attr('stroke-dasharray', '2 2');

      const chDot = crosshair
        .append('circle')
        .attr('r', 4.5)
        .attr('fill', 'var(--md-sys-color-primary)')
        .attr('stroke', 'var(--md-sys-color-surface)')
        .attr('stroke-width', 2);

      g.append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .attr('cursor', 'crosshair')
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event);
          const score = Number(xScale.invert(mx).toFixed(1));
          const countLess = sorted.filter(v => v <= score).length;
          const cdfPct = Number(((countLess / sorted.length) * 100).toFixed(1));
          const countGreater = sorted.length - countLess;
          const probGreater = Number(((countGreater / sorted.length) * 100).toFixed(1));
          const yPos = yScale(cdfPct);

          crosshair.style('display', null);
          chLine.attr('x1', mx).attr('x2', mx);
          chDot.attr('cx', mx).attr('cy', yPos);

          setHoveredData({
            score,
            cdfPct,
            probGreater,
            xPos: mx + margin.left,
            yPos: yPos + margin.top,
          });
        })
        .on('mouseleave', function () {
          crosshair.style('display', 'none');
          setHoveredData(null);
        });
    }

    // ==========================================
    // 3. STOCHASTIC TRAJECTORIES (SPAGHETTI RIBBON)
    // ==========================================
    if (viewMode === 'trajectories') {
      const days = 90;
      const xScale = d3.scaleLinear().domain([0, days]).range([0, innerWidth]);
      const yScale = d3.scaleLinear().domain([30, 98]).range([innerHeight, 0]);

      // Grid
      g.append('g')
        .attr('opacity', 0.15)
        .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(() => ''))
        .selectAll('line')
        .attr('stroke', 'var(--md-sys-color-outline-variant)');

      // Draw sample individual stochastic paths
      const paths = scenario.samplePaths || [];
      const lineGen = d3
        .line<number>()
        .x((_, idx) => xScale(idx))
        .y(d => yScale(d))
        .curve(d3.curveBasis);

      const pathGroup = g.append('g').attr('class', 'sample-paths');
      paths.forEach(p => {
        pathGroup
          .append('path')
          .datum(p)
          .attr('fill', 'none')
          .attr('stroke', p[p.length - 1] >= scenario.targetComposite ? '#10b981' : 'var(--md-sys-color-primary)')
          .attr('stroke-width', 0.85)
          .attr('opacity', 0.18)
          .attr('d', lineGen);
      });

      // Percentile Envelope Area (P10 to P90)
      const p10Data = scenario.p10 || [];
      const p90Data = scenario.p90 || [];
      const p50Data = scenario.p50 || [];

      if (p10Data.length > 0 && p90Data.length > 0) {
        const stepDays = days / (p10Data.length - 1);
        const envelopeData = p10Data.map((p10Val, i) => ({
          day: i * stepDays,
          p10: p10Val,
          p90: p90Data[i] ?? p10Val,
        }));

        const areaGen = d3
          .area<{ day: number; p10: number; p90: number }>()
          .x(d => xScale(d.day))
          .y0(d => yScale(d.p10))
          .y1(d => yScale(d.p90))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(envelopeData)
          .attr('fill', 'url(#d3-density-grad)')
          .attr('opacity', 0.5)
          .attr('d', areaGen);

        // P50 Median Line
        const p50Gen = d3
          .line<number>()
          .x((_, i) => xScale(i * stepDays))
          .y(d => yScale(d))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(p50Data)
          .attr('fill', 'none')
          .attr('stroke', 'var(--md-sys-color-primary)')
          .attr('stroke-width', 3)
          .attr('d', p50Gen);
      }

      // Target line
      const targetY = yScale(scenario.targetComposite);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', targetY)
        .attr('y2', targetY)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 3');

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', targetY - 5)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', '700')
        .attr('fill', '#f59e0b')
        .text(`Elite Target (${scenario.targetComposite} OVR)`);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `Day ${d}`))
        .attr('color', 'var(--md-sys-color-on-surface-variant)')
        .selectAll('text')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace');

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .attr('color', 'var(--md-sys-color-on-surface-variant)')
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');
    }
  }, [dimensions, outcomes, viewMode, scenario, stats]);

  return (
    <div
      className="p-5 sm:p-6 rounded-3xl border shadow-sm transition-all"
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      {/* Header bar with title and View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              D3.js Empirical Engine
            </span>
            <span className="text-xs font-semibold text-on-surface-variant">
              N = {iterations.toLocaleString()} runs
            </span>
          </div>
          <h3 className="text-base font-bold font-display text-on-surface mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Forward Probability Distribution Chart</span>
          </h3>
          <p className="text-xs text-on-surface-variant">
            Gaussian kernel density estimation and stochastic outcome density for the 90-day simulation.
          </p>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-surface-container-high border border-outline-variant self-start sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('density')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'density'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Density Curve</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cdf')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'cdf'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>CDF Odds</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('trajectories')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'trajectories'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Spaghetti 90D</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full overflow-visible"
        />

        {/* Dynamic HTML Tooltip Overlay on Crosshair */}
        {hoveredData && (
          <div
            className="absolute pointer-events-none p-3 rounded-2xl border shadow-xl z-20 transition-transform duration-75 text-xs font-sans"
            style={{
              left: Math.min(dimensions.width - 170, Math.max(10, hoveredData.xPos - 75)),
              top: Math.max(10, hoveredData.yPos - 85),
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="font-mono font-bold text-sm text-primary flex items-center justify-between gap-3">
              <span>{hoveredData.score} OVR</span>
              {hoveredData.score >= scenario.targetComposite ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                  Elite
                </span>
              ) : (
                <span className="text-[10px] text-on-surface-variant font-normal">Score</span>
              )}
            </div>

            {viewMode === 'density' && (
              <div className="mt-1 space-y-0.5 text-[11px] text-on-surface-variant">
                <div className="flex justify-between gap-3">
                  <span>Relative Density:</span>
                  <span className="font-mono font-bold text-on-surface">{hoveredData.density}%</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Odds of reaching ≥ {hoveredData.score}:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {hoveredData.probGreater}%
                  </span>
                </div>
              </div>
            )}

            {viewMode === 'cdf' && (
              <div className="mt-1 space-y-0.5 text-[11px] text-on-surface-variant">
                <div className="flex justify-between gap-3">
                  <span>Cumulative % (≤ {hoveredData.score}):</span>
                  <span className="font-mono font-bold text-on-surface">{hoveredData.cdfPct}%</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Chance of exceeding:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {hoveredData.probGreater}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistical Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-outline-variant">
        <div className="p-3 rounded-2xl bg-surface-container-high border border-outline-variant text-center">
          <div className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider">Median (P50)</div>
          <div className="text-base font-bold font-mono text-primary mt-0.5">{stats.median}</div>
          <div className="text-[10px] text-on-surface-variant">Expected Target</div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-container-high border border-outline-variant text-center">
          <div className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider">Mean &bull; StdDev</div>
          <div className="text-base font-bold font-mono text-on-surface mt-0.5">
            {stats.mean} <span className="text-xs font-normal text-on-surface-variant">&plusmn;{stats.stdDev}</span>
          </div>
          <div className="text-[10px] text-on-surface-variant">&sigma; Dispersion</div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-container-high border border-outline-variant text-center">
          <div className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider">80% Range (P10-P90)</div>
          <div className="text-base font-bold font-mono text-on-surface mt-0.5">
            {stats.p10} &ndash; {stats.p90}
          </div>
          <div className="text-[10px] text-on-surface-variant">Confidence Envelope</div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-container-high border border-outline-variant text-center">
          <div className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider">IQR (P25-P75)</div>
          <div className="text-base font-bold font-mono text-on-surface mt-0.5">
            {stats.p25} &ndash; {stats.p75}
          </div>
          <div className="text-[10px] text-on-surface-variant">Interquartile Core</div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-container-high border border-outline-variant text-center">
          <div className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider">Elite Odds (&ge;82)</div>
          <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {stats.probElite}%
          </div>
          <div className="text-[10px] text-on-surface-variant">Target Win %</div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-container-high border border-outline-variant text-center">
          <div className="text-[10px] text-on-surface-variant uppercase font-mono tracking-wider">Tail Risk (P01)</div>
          <div className="text-base font-bold font-mono text-rose-500 mt-0.5">{stats.p01}</div>
          <div className="text-[10px] text-on-surface-variant">99% VaR Floor</div>
        </div>
      </div>
    </div>
  );
};
