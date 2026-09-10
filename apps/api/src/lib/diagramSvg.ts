import { createHash } from 'node:crypto';

// Shared by future imports and repairs of existing live diagrams.
export function readableBlackboardSvg(buffer: Buffer): Buffer {
  const svg = buffer.toString('utf8').replace(/<style\b[^>]*data-sypher-theme=["'][^"']+["'][^>]*>[\s\S]*?<\/style>/gi, '');
  const rootId = svg.match(/<svg\b[^>]*\bid=["']([A-Za-z_][\w-]*)["']/)?.[1];
  if (!rootId || !svg.includes('</svg>')) throw new Error('Diagram SVG must have a valid root id and closing svg tag');
  const style = `<style data-sypher-theme="blackboard-v4">
#my-svg{background:#0B0F14!important;background-color:#0B0F14!important;color:#E8EEF5!important;}
#my-svg text,#my-svg tspan,#my-svg .nodeLabel,#my-svg .nodeLabel *,#my-svg .edgeLabel,#my-svg .edgeLabel *,#my-svg .label,#my-svg .label *,#my-svg .labelText,#my-svg .loopText,#my-svg .messageText,#my-svg .noteText,#my-svg .actor,#my-svg .actor *,#my-svg .cluster-label,#my-svg .cluster-label *,#my-svg .classTitleText,#my-svg .taskText,#my-svg .taskTextOutsideRight,#my-svg .taskTextOutsideLeft,#my-svg .sectionTitle,#my-svg .titleText,#my-svg .pieTitleText,#my-svg .legend,#my-svg .branch-label,#my-svg .commit-label,#my-svg .mindmap-node,#my-svg .timeline-node,#my-svg .packetLabel,#my-svg .architecture-service,#my-svg foreignObject,#my-svg foreignObject *{color:#E8EEF5!important;fill:#E8EEF5!important;stroke:none!important;}
#my-svg .node rect,#my-svg .node circle,#my-svg .node ellipse,#my-svg .node polygon,#my-svg .node .label-container,#my-svg .node .outer-path,#my-svg g.classGroup rect,#my-svg .statediagram-state rect,#my-svg .statediagram-state polygon,#my-svg rect.actor,#my-svg .actor-box,#my-svg .labelBox,#my-svg .requirementBox,#my-svg .elementBox,#my-svg .entityBox,#my-svg .attributeBoxEven,#my-svg .attributeBoxOdd,#my-svg .block rect,#my-svg .block polygon,#my-svg .kanban-item .label-container,#my-svg .architecture-service rect,#my-svg .architecture-group rect,#my-svg .c4Shape rect,#my-svg .packet rect,#my-svg [class*="packet"] rect,#my-svg [class*="event"] .label-container,#my-svg [class*="swimlane"] .label-container{fill:#16202C!important;stroke:#5EA3E6!important;}
#my-svg .node .label-container path,#my-svg .node .outer-path path,#my-svg .node-bkg{stroke:#5EA3E6!important;}#my-svg .node .label-container path[fill]:not([fill="none"]):not([fill="transparent"]),#my-svg .node .outer-path path[fill]:not([fill="none"]):not([fill="transparent"]),#my-svg .node-bkg{fill:#16202C!important;}
#my-svg rect[class*="task"],#my-svg polygon[class*="task"],#my-svg .journey-section rect,#my-svg .gantt .task,#my-svg .kanban-item rect,#my-svg .timeline-node rect,#my-svg .timeline-node-section rect,#my-svg .architecture-service .label-container,#my-svg .architecture-group .label-container,#my-svg .person rect,#my-svg .system rect,#my-svg .container rect,#my-svg .component rect{fill:#16202C!important;stroke:#5EA3E6!important;}
#my-svg .cluster rect,#my-svg .cluster polygon,#my-svg .architecture-group rect,#my-svg .boundary,#my-svg .section,#my-svg .kanban-section{fill:#101720!important;stroke:#33465C!important;}
#my-svg rect.note,#my-svg polygon.note,#my-svg .note rect,#my-svg .note polygon,#my-svg .statediagram-note rect,#my-svg .note-cluster rect{fill:#16202C!important;stroke:#5EA3E6!important;}
#my-svg .edgeLabel,#my-svg .edgeLabel *{background:#0B0F14!important;background-color:#0B0F14!important;}
#my-svg .labelBkg,#my-svg .edgeLabel rect,#my-svg .edgeLabel polygon,#my-svg .edgeLabel span,#my-svg .relationshipLabelBox,#my-svg .requirementLabelBox{fill:#0B0F14!important;background:#0B0F14!important;background-color:#0B0F14!important;}
#my-svg .flowchart-link,#my-svg .edgePath path,#my-svg .edgePaths path,#my-svg .messageLine0,#my-svg .messageLine1,#my-svg .actor-line,#my-svg .loopLine,#my-svg .relation,#my-svg .relationshipLine,#my-svg .transition,#my-svg .requirementRelation,#my-svg .mindmap-edge,#my-svg .timeline-edge,#my-svg .architecture-edge,#my-svg .c4Shape line,#my-svg .divider,#my-svg .divider path,#my-svg line{stroke:#5EA3E6!important;}
#my-svg .gitGraph path,#my-svg path[class*="branch"],#my-svg path[class*="edge"],#my-svg path[class*="relation"],#my-svg path[class*="transition"],#my-svg path[class*="connector"],#my-svg path[class*="link"]{stroke:#5EA3E6!important;}
#my-svg marker path,#my-svg marker polygon,#my-svg .marker,#my-svg .arrowMarkerPath,#my-svg [id*="arrowhead"] path,#my-svg [id*="arrowhead"] polygon,#my-svg [id*="composition"] path,#my-svg [id*="composition"] polygon,#my-svg [id*="dependency"] path,#my-svg [id*="dependency"] polygon,#my-svg [id*="extension"] path,#my-svg [id*="extension"] polygon,#my-svg [id*="aggregation"] path,#my-svg [id*="aggregation"] polygon{fill:#5EA3E6!important;stroke:#5EA3E6!important;}
#my-svg .state-start,#my-svg .state-end,#my-svg .commit,#my-svg .quadrant-point{fill:#5EA3E6!important;stroke:#5EA3E6!important;}
#my-svg .grid .tick line,#my-svg .axis-line,#my-svg .quadrant-x-axis line,#my-svg .quadrant-y-axis line,#my-svg .radar-axis-line,#my-svg .radar-graticule{stroke:#33465C!important;}
#my-svg .sankey-link{stroke:#5EA3E6!important;fill:none!important;}
#my-svg .label-icon path,#my-svg .icon-shape path,#my-svg .icon-neo path{fill:#E8EEF5!important;stroke:#E8EEF5!important;}
</style>`;
  return Buffer.from(svg.replace('</svg>', `${style.replaceAll('#my-svg', `#${rootId}`)}</svg>`), 'utf8');
}

export function diagramSvgFilename(sourceFilename: string, buffer: Buffer): string {
  const digest = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  const stem = sourceFilename.replace(/(?:\.blackboard-v\d+-[a-f0-9]+)?\.svg$/i, '');
  return `${stem}.blackboard-v4-${digest}.svg`;
}

