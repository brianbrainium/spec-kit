import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dagre from 'dagre';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import * as XLSX from 'xlsx';

const REQUIRED_COLUMNS = ['ID', 'Parent', 'Work Item Type', 'Process sequence ID'] as const;
const TITLE_COLUMNS = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5', 'Title 6', 'Title 7'] as const;
const METADATA_COLUMNS = [
  'Catalog status',
  'Article status',
  'Business process flow status',
  'Description',
  'Scope',
  'Application family',
  'Products',
  'Industries',
  'APQC ID',
  'APQC description',
  'Microsoft references',
  'Update comments',
] as const;

const EXPECTED_SUMMARY = {
  rows: 5767,
  byType: {
    Tree: 1,
    'End to end': 15,
    'Process area': 94,
    Process: 672,
    Scenario: 3436,
    'System process': 455,
    'Test cases': 1094,
  } as Record<string, number>,
  rootTitle: 'Business Process Catalog (Why)',
};

type ViewMode = 'focus' | 'full';

type BpxRecord = {
  id: string;
  parent: string;
  workItemType: string;
  processSequenceId: string;
  title: string;
  level: number;
  metadata: Record<string, string>;
};

type DomainIndex = {
  rows: BpxRecord[];
  rowMap: Map<string, BpxRecord>;
  childrenMap: Map<string, string[]>;
  roots: string[];
  byType: Record<string, number>;
};

type LoadedSummary = {
  totalRows: number;
  byType: Record<string, number>;
  rootTitle: string;
  warnings: string[];
};

const rank = (value: string) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
};

const normalizeId = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, '');
  }
  return String(value).trim().replace(/\.0+$/, '');
};

const toText = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());

const buildDomainIndex = (rows: BpxRecord[]): DomainIndex => {
  const rowMap = new Map<string, BpxRecord>();
  const childrenMap = new Map<string, string[]>();
  const byType: Record<string, number> = {};

  rows.forEach((row) => {
    if (rowMap.has(row.id)) {
      throw new Error(`Duplicate ID detected: ${row.id}`);
    }
    rowMap.set(row.id, row);
    byType[row.workItemType] = (byType[row.workItemType] || 0) + 1;
    if (!childrenMap.has(row.id)) {
      childrenMap.set(row.id, []);
    }
  });

  const roots: string[] = [];
  rows.forEach((row) => {
    if (!row.parent) {
      roots.push(row.id);
      return;
    }
    if (!rowMap.has(row.parent)) {
      throw new Error(`Parent reference not found for ID ${row.id}: ${row.parent}`);
    }
    const children = childrenMap.get(row.parent);
    if (!children) {
      childrenMap.set(row.parent, [row.id]);
    } else {
      children.push(row.id);
    }
  });

  childrenMap.forEach((children) => {
    children.sort((a, b) => {
      const rowA = rowMap.get(a)!;
      const rowB = rowMap.get(b)!;
      const seqDiff = rank(rowA.processSequenceId) - rank(rowB.processSequenceId);
      if (seqDiff !== 0) return seqDiff;
      return rowA.title.localeCompare(rowB.title);
    });
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const detectCycle = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Cycle detected at node ${id}`);
    }
    visiting.add(id);
    const children = childrenMap.get(id) || [];
    children.forEach(detectCycle);
    visiting.delete(id);
    visited.add(id);
  };
  rows.forEach((row) => detectCycle(row.id));

  return { rows, rowMap, childrenMap, roots, byType };
};

const parseWorkbook = async (file: File): Promise<{ index: DomainIndex; summary: LoadedSummary }> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('Workbook has no sheets');

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: '',
    raw: false,
  });

  if (!rawRows.length) throw new Error('Sheet is empty');

  const missingRequired = REQUIRED_COLUMNS.filter((column) => !(column in rawRows[0]!));
  if (missingRequired.length) {
    throw new Error(`Missing required columns: ${missingRequired.join(', ')}`);
  }

  const parsed = rawRows.map((raw, idx) => {
    const id = normalizeId(raw.ID);
    if (!id) {
      throw new Error(`Row ${idx + 2}: ID is required`);
    }
    const parent = normalizeId(raw.Parent);

    const titleIndex = TITLE_COLUMNS.findIndex((col) => toText(raw[col]));
    const level = titleIndex >= 0 ? titleIndex + 1 : 1;
    const title = titleIndex >= 0 ? toText(raw[TITLE_COLUMNS[titleIndex]]) : `(Untitled ${id})`;

    const metadata: Record<string, string> = {};
    METADATA_COLUMNS.forEach((column) => {
      if (column in raw) {
        metadata[column] = toText(raw[column]);
      }
    });

    return {
      id,
      parent,
      workItemType: toText(raw['Work Item Type']) || 'Unknown',
      processSequenceId: toText(raw['Process sequence ID']),
      title,
      level,
      metadata,
    } satisfies BpxRecord;
  });

  const index = buildDomainIndex(parsed);

  const rootTitle = index.roots.length ? index.rowMap.get(index.roots[0])?.title || '' : '';
  const warnings: string[] = [];
  if (index.rows.length !== EXPECTED_SUMMARY.rows) {
    warnings.push(`Expected ${EXPECTED_SUMMARY.rows} rows, loaded ${index.rows.length}.`);
  }
  Object.entries(EXPECTED_SUMMARY.byType).forEach(([type, expected]) => {
    const actual = index.byType[type] || 0;
    if (actual !== expected) {
      warnings.push(`Type count mismatch for ${type}: expected ${expected}, loaded ${actual}.`);
    }
  });
  if (rootTitle !== EXPECTED_SUMMARY.rootTitle) {
    warnings.push(`Root title mismatch: expected "${EXPECTED_SUMMARY.rootTitle}", loaded "${rootTitle || '(none)'}".`);
  }

  return {
    index,
    summary: {
      totalRows: index.rows.length,
      byType: index.byType,
      rootTitle,
      warnings,
    },
  };
};

const getAncestors = (id: string, rowMap: Map<string, BpxRecord>) => {
  const ancestors: string[] = [];
  let current = rowMap.get(id);
  while (current?.parent) {
    ancestors.push(current.parent);
    current = rowMap.get(current.parent);
  }
  return ancestors;
};

const getVisibleIds = ({
  index,
  selectedId,
  mode,
  maxDepth,
}: {
  index: DomainIndex;
  selectedId: string | null;
  mode: ViewMode;
  maxDepth: number;
}) => {
  if (mode === 'focus') {
    const pivot = selectedId || index.roots[0];
    if (!pivot) return new Set<string>();

    const visible = new Set<string>([pivot]);
    getAncestors(pivot, index.rowMap).forEach((id) => visible.add(id));
    (index.childrenMap.get(pivot) || []).forEach((id) => visible.add(id));
    return visible;
  }

  const roots = index.roots;
  const visible = new Set<string>();
  const queue = roots.map((id) => ({ id, depth: 1 }));
  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth > maxDepth) continue;
    visible.add(current.id);
    (index.childrenMap.get(current.id) || []).forEach((childId) => {
      queue.push({ id: childId, depth: current.depth + 1 });
    });
  }
  return visible;
};

const layoutGraph = (nodes: Node[], edges: Edge[]) => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 60 });

  nodes.forEach((node) => graph.setNode(node.id, { width: 220, height: 70 }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - 110,
        y: position.y - 35,
      },
    };
  });
};

const layoutFocusLanes = ({
  nodes,
  edges,
  selectedId,
}: {
  nodes: Node[];
  edges: Edge[];
  selectedId: string;
}) => {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();

  nodeIds.forEach((id) => {
    incoming.set(id, new Set());
    outgoing.set(id, new Set());
  });

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
    outgoing.get(edge.source)?.add(edge.target);
    incoming.get(edge.target)?.add(edge.source);
  });

  const walk = (start: string, neighbors: (id: string) => Set<string> | undefined) => {
    const visited = new Set<string>();
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      (neighbors(current) || []).forEach((next) => {
        if (visited.has(next) || next === start) return;
        visited.add(next);
        queue.push(next);
      });
    }
    return visited;
  };

  const upstream = walk(selectedId, (id) => incoming.get(id));
  const downstream = walk(selectedId, (id) => outgoing.get(id));
  const directChildren = outgoing.get(selectedId) || new Set<string>();

  const topLane = Array.from(upstream).filter((id) => id !== selectedId);
  const middleLane = [
    ...Array.from(directChildren).filter((id) => id !== selectedId),
    selectedId,
  ];
  const bottomLane = Array.from(downstream).filter((id) => id !== selectedId && !directChildren.has(id));

  const leftovers = nodes
    .map((node) => node.id)
    .filter((id) => !topLane.includes(id) && !middleLane.includes(id) && !bottomLane.includes(id));

  const laneY = {
    top: 40,
    middle: 220,
    bottom: 400,
    extra: 580,
  };
  const spacing = 260;

  const placeLane = (ids: string[], y: number) => {
    const selectedIndex = ids.indexOf(selectedId);
    const centerIndex = selectedIndex >= 0 ? selectedIndex : Math.floor(ids.length / 2);
    return new Map(
      ids.map((id, index) => {
        const offset = index - centerIndex;
        return [id, { x: 600 + offset * spacing, y }];
      }),
    );
  };

  const positions = new Map<string, { x: number; y: number }>([
    ...placeLane(topLane, laneY.top),
    ...placeLane(middleLane, laneY.middle),
    ...placeLane(bottomLane, laneY.bottom),
    ...placeLane(leftovers, laneY.extra),
  ]);

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) || node.position,
  }));
};

const BusinessProcessExplorerCanvas = () => {
  const [index, setIndex] = useState<DomainIndex | null>(null);
  const [summary, setSummary] = useState<LoadedSummary | null>(null);
  const [error, setError] = useState<string>('');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('focus');
  const [depth, setDepth] = useState(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [largeGraphConfirmed, setLargeGraphConfirmed] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const flow = useReactFlow();

  const onUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const parsed = await parseWorkbook(file);
      setIndex(parsed.index);
      setSummary(parsed.summary);
      const initial = parsed.index.roots[0] || parsed.index.rows[0]?.id || null;
      setSelectedId(initial);
      setViewMode('focus');
      setDepth(4);
      setLargeGraphConfirmed(false);
    } catch (err) {
      setIndex(null);
      setSummary(null);
      setSelectedId(null);
      setNodes([]);
      setEdges([]);
      setError(err instanceof Error ? err.message : 'Unknown parse error');
    }
  }, [setEdges, setNodes]);

  const searchResults = useMemo(() => {
    if (!index || !query.trim()) return [];
    const lower = query.toLowerCase();
    return index.rows
      .filter((row) => row.title.toLowerCase().includes(lower) || row.id.includes(lower))
      .slice(0, 100);
  }, [index, query]);

  const breadcrumbs = useMemo(() => {
    if (!index || !selectedId) return [] as BpxRecord[];
    const ids = [selectedId, ...getAncestors(selectedId, index.rowMap)].reverse();
    return ids.map((id) => index.rowMap.get(id)).filter(Boolean) as BpxRecord[];
  }, [index, selectedId]);

  const graphProjection = useMemo(() => {
    if (!index) return { nodes: [] as Node[], edges: [] as Edge[], blocked: false };

    const visibleIds = getVisibleIds({
      index,
      selectedId,
      mode: viewMode,
      maxDepth: depth,
    });

    if (viewMode === 'full' && visibleIds.size > 1500 && !largeGraphConfirmed) {
      return { nodes: [], edges: [], blocked: true };
    }

    const projectedNodes: Node[] = Array.from(visibleIds).map((id) => {
      const row = index.rowMap.get(id)!;
      return {
        id,
        data: { label: `${row.title}\n${row.workItemType}` },
        position: { x: 0, y: 0 },
        selectable: true,
        draggable: false,
        style: {
          width: 220,
          fontSize: 12,
          border: id === selectedId ? '2px solid #2563eb' : '1px solid #9ca3af',
          background: '#fff',
          whiteSpace: 'pre-line',
        },
      };
    });

    const projectedEdges: Edge[] = [];
    visibleIds.forEach((id) => {
      const parent = index.rowMap.get(id)?.parent;
      if (parent && visibleIds.has(parent)) {
        projectedEdges.push({ id: `${parent}->${id}`, source: parent, target: id, animated: false });
      }
    });

    const positionedNodes =
      viewMode === 'focus' && selectedId
        ? layoutFocusLanes({ nodes: projectedNodes, edges: projectedEdges, selectedId })
        : layoutGraph(projectedNodes, projectedEdges);

    return {
      nodes: positionedNodes,
      edges: projectedEdges,
      blocked: false,
    };
  }, [index, selectedId, viewMode, depth, largeGraphConfirmed]);

  useEffect(() => {
    if (!index) return;
    setNodes(graphProjection.nodes);
    setEdges(graphProjection.edges);
  }, [index, graphProjection, setEdges, setNodes]);

  useEffect(() => {
    if (!selectedId) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;
    flow.setCenter(node.position.x + 110, node.position.y + 35, { duration: 300, zoom: 0.85 });
  }, [selectedId, nodes, flow]);

  const onNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    setSelectedId(node.id);
  }, []);

  const onNodeDoubleClick = useCallback<NodeMouseHandler>((_, node) => {
    setViewMode('focus');
    setSelectedId(node.id);
  }, []);

  const fitGraph = useCallback(() => flow.fitView({ duration: 400, padding: 0.1 }), [flow]);

  const resetView = useCallback(() => {
    setViewMode('focus');
    setDepth(4);
    setLargeGraphConfirmed(false);
    if (index) {
      setSelectedId(index.roots[0] || index.rows[0]?.id || null);
    }
  }, [index]);

  const exportVisibleJson = useCallback(() => {
    if (!index) return;
    const visibleIds = new Set(nodes.map((node) => node.id));
    const payload = index.rows.filter((row) => visibleIds.has(row.id));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bpx-visible-subgraph.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }, [index, nodes]);

  const selectedNode = selectedId && index ? index.rowMap.get(selectedId) : null;

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100vh' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        <input type="file" accept=".xlsx,.xls" onChange={onUpload} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or ID" />
        <label>
          View
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
            <option value="focus">Focus</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label>
          Depth
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button onClick={fitGraph}>Fit view</button>
        <button onClick={resetView}>Collapse/Reset</button>
        <button onClick={exportVisibleJson} disabled={!nodes.length}>
          Export JSON
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', minHeight: 0 }}>
        <aside style={{ borderRight: '1px solid #e5e7eb', overflow: 'auto', padding: 8 }}>
          <h3>Loaded summary</h3>
          {summary ? (
            <>
              <div>Total rows: {summary.totalRows}</div>
              <div>Root title: {summary.rootTitle || '(none)'}</div>
              <ul>
                {Object.entries(summary.byType)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([type, count]) => (
                    <li key={type}>
                      {type}: {count}
                    </li>
                  ))}
              </ul>
              {summary.warnings.length > 0 && (
                <div style={{ color: '#b91c1c' }}>
                  {summary.warnings.map((warning) => (
                    <div key={warning}>⚠ {warning}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>Upload an Excel workbook to begin.</div>
          )}

          <h3>Breadcrumbs</h3>
          <ol>
            {breadcrumbs.map((row) => (
              <li key={row.id}>
                <button onClick={() => setSelectedId(row.id)}>{row.title}</button>
              </li>
            ))}
          </ol>

          <h3>Search results</h3>
          <ul>
            {searchResults.map((row) => (
              <li key={row.id}>
                <button onClick={() => setSelectedId(row.id)}>{row.title}</button>
              </li>
            ))}
          </ul>
        </aside>

        <main style={{ minHeight: 0 }}>
          {error && <div style={{ color: '#b91c1c', padding: 12 }}>Error: {error}</div>}
          {graphProjection.blocked ? (
            <div style={{ padding: 12 }}>
              Full mode would render over 1500 nodes. Reduce depth or confirm large render.
              <button onClick={() => setLargeGraphConfirmed(true)}>Render anyway</button>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              fitView
            >
              <MiniMap pannable zoomable />
              <Controls />
              <Background gap={14} />
            </ReactFlow>
          )}
        </main>

        <aside style={{ borderLeft: '1px solid #e5e7eb', overflow: 'auto', padding: 8 }}>
          <h3>Inspector</h3>
          {!selectedNode ? (
            <div>Select a node.</div>
          ) : (
            <>
              <div><strong>{selectedNode.title}</strong></div>
              <div>ID: {selectedNode.id}</div>
              <div>Parent: {selectedNode.parent || '(root)'}</div>
              <div>Work Item Type: {selectedNode.workItemType}</div>
              <div>Level: {selectedNode.level}</div>
              <div>Process sequence ID: {selectedNode.processSequenceId || '(empty)'}</div>
              <h4>Metadata</h4>
              <dl>
                {Object.entries(selectedNode.metadata).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt style={{ fontWeight: 600 }}>{key}</dt>
                    <dd style={{ marginInlineStart: 0 }}>{value || '(empty)'}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

const BusinessProcessExplorer = () => (
  <ReactFlowProvider>
    <BusinessProcessExplorerCanvas />
  </ReactFlowProvider>
);

export default BusinessProcessExplorer;
