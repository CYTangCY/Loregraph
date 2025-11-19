import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, CharacterNode, RelationshipLink } from '../types';

interface ForceGraphProps {
  data: GraphData;
  onNodeClick: (node: CharacterNode) => void;
  onLinkClick: (link: RelationshipLink) => void;
  width: number;
  height: number;
}

const AXIS_COLORS: Record<string, string> = {
  love: '#ec4899', friendship: '#22c55e', kinship: '#14b8a6',
  trust: '#3b82f6', fear: '#9333ea', respect: '#f59e0b',
  desire: '#be123c', discipline: '#94a3b8', power: '#7f1d1d', default: '#475569'
};

const ForceGraph: React.FC<ForceGraphProps> = ({ data, onNodeClick, onLinkClick, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    if (data.nodes.length === 0) return;

    const nodes = data.nodes.map(d => ({ ...d })) as (CharacterNode & d3.SimulationNodeDatum)[];
    const links = data.links.map(d => ({ ...d })) as (RelationshipLink & d3.SimulationLinkDatum<d3.SimulationNodeDatum>)[];

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(280))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(60));

    const defs = svg.append("defs");
    Object.entries(AXIS_COLORS).forEach(([key, color]) => {
        defs.append("marker").attr("id", `arrow-${key}`).attr("viewBox", "0 -5 10 10").attr("refX", 25).attr("refY", 0).attr("markerWidth", 4).attr("markerHeight", 4).attr("orient", "auto").append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", color);
    });

    const link = svg.append("g").selectAll("path").data(links).join("path")
      .attr("stroke", d => AXIS_COLORS[d.dominantEmotion] || AXIS_COLORS.default)
      .attr("stroke-width", 2).attr("opacity", 0.8).attr("marker-end", d => `url(#arrow-${d.dominantEmotion || 'default'})`)
      .attr("cursor", "pointer")
      .on("click", (event, d) => { event.stopPropagation(); const originalLink = data.links.find(l => l.source === (d.source as any).id && l.target === (d.target as any).id); if(originalLink) onLinkClick(originalLink); });

    const linkHitbox = svg.append("g").selectAll("path").data(links).join("path").attr("stroke", "transparent").attr("stroke-width", 15).attr("fill", "none").attr("cursor", "pointer")
      .on("click", (event, d) => { event.stopPropagation(); const originalLink = data.links.find(l => l.source === (d.source as any).id && l.target === (d.target as any).id); if(originalLink) onLinkClick(originalLink); });

    const node = svg.append("g").selectAll("g").data(nodes).join("g").attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, any>().on("start", (e, d) => { if(!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }).on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; }).on("end", (e, d) => { if(!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on("click", (event, d) => { event.stopPropagation(); const originalNode = data.nodes.find(n => n.id === d.id); if(originalNode) onNodeClick(originalNode); });

    node.append("circle").attr("r", 20).attr("fill", "#0f172a").attr("stroke", d => d3.schemeTableau10[d.group % 10]).attr("stroke-width", 3);
    node.append("text").text(d => d.name.substring(0, 2).toUpperCase()).attr("dy", 4).attr("text-anchor", "middle").style("font-size", "10px").style("fill", "#e2e8f0").style("font-weight", "bold").style("pointer-events", "none");
    node.append("text").text(d => d.name).attr("x", 26).attr("y", 4).style("fill", "#94a3b8").style("font-size", "12px").style("font-weight", "bold").style("text-shadow", "2px 2px 2px black");

    simulation.on("tick", () => {
      const pathFn = (d: any) => { const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, dr = Math.sqrt(dx * dx + dy * dy); const isBidirectional = links.some(l => l.source === d.target && l.target === d.source); if (isBidirectional || d.source === d.target) return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`; return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`; };
      link.attr("d", pathFn); linkHitbox.attr("d", pathFn); node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    return () => { simulation.stop(); };
  }, [data, width, height]);
  return <svg ref={svgRef} width={width} height={height} className="bg-slate-950/50 rounded-lg w-full h-full" />;
};
export default ForceGraph;