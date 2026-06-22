/**
 * AgentContext — AI 系统控制权的核心桥梁
 *
 * AI 通过 SSE 流返回结构化 tool_call 指令，前端解析后调用此 context
 * 的 dispatch 方法，直接控制可视化面板的状态。
 *
 * v2: show_molecule 现在自动从 RCSB PDB 拉取真实结构文件
 */
import { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

// ─── 可视化状态类型 ────────────────────────────────────────────────────────────

export type VizMode =
  | 'idle'           // 空闲/欢迎
  | 'loading'        // 加载中
  | 'molecule_3d'    // 展示单个分子 3D 结构
  | 'docking_anim'   // 对接动画（筛选进行中）
  | 'docking_result' // 对接结果展示
  | 'pipeline'       // Pipeline 进度
  | 'sequence_2d';   // 2D 序列图

export interface DockingCandidate {
  rank: number;
  sequence: string;
  score: number;       // ΔG (kcal/mol)
  confidence: number;  // pLDDT
  activity: string;    // 预测活性类型
  pdbData?: string;    // PDB 结构数据
}

export interface VizState {
  mode: VizMode;
  targetProtein: string | null;
  sequences: string[];
  queryId: number | null;
  pdbData: string | null;
  moleculeName: string | null;
  dockingCandidates: DockingCandidate[];
  selectedCandidate: number | null;
  animationPhase: 'approach' | 'binding' | 'bound' | null;
  statusMessage: string | null;
  highlightResidues: number[];
  /** Whether the current pdbData came from real RCSB data */
  isRealPdbData: boolean;
  /** PDB ID of the currently displayed structure */
  currentPdbId: string | null;
  /** RCSB URL for the current structure */
  rcsbUrl: string | null;
  /** Whether a PDB fetch is in progress */
  pdbFetchLoading: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type AgentAction =
  | { type: 'SET_MODE'; mode: VizMode; message?: string }
  | { type: 'SHOW_MOLECULE'; pdbData: string; name: string; sequence?: string; isRealData?: boolean; pdbId?: string; rcsbUrl?: string }
  | { type: 'SET_PDB_LOADING'; loading: boolean; name?: string }
  | { type: 'START_DOCKING'; target: string; sequences: string[]; queryId: number }
  | { type: 'UPDATE_DOCKING_ANIMATION'; phase: 'approach' | 'binding' | 'bound' }
  | { type: 'SET_DOCKING_RESULTS'; candidates: DockingCandidate[] }
  | { type: 'SELECT_CANDIDATE'; index: number }
  | { type: 'SET_STATUS'; message: string }
  | { type: 'RESET' };

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: VizState = {
  mode: 'idle',
  targetProtein: null,
  sequences: [],
  queryId: null,
  pdbData: null,
  moleculeName: null,
  dockingCandidates: [],
  selectedCandidate: null,
  animationPhase: null,
  statusMessage: null,
  highlightResidues: [],
  isRealPdbData: false,
  currentPdbId: null,
  rcsbUrl: null,
  pdbFetchLoading: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function vizReducer(state: VizState, action: AgentAction): VizState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode, statusMessage: action.message ?? state.statusMessage };

    case 'SHOW_MOLECULE':
      return {
        ...state,
        mode: 'molecule_3d',
        pdbData: action.pdbData,
        moleculeName: action.name,
        sequences: action.sequence ? [action.sequence] : state.sequences,
        statusMessage: `Viewing: ${action.name}`,
        isRealPdbData: action.isRealData ?? false,
        currentPdbId: action.pdbId ?? null,
        rcsbUrl: action.rcsbUrl ?? null,
        pdbFetchLoading: false,
      };

    case 'SET_PDB_LOADING':
      return {
        ...state,
        mode: 'loading',
        pdbFetchLoading: action.loading,
        statusMessage: action.loading
          ? (action.name ? `Fetching PDB structure for ${action.name}...` : 'Fetching PDB structure...')
          : state.statusMessage,
      };

    case 'START_DOCKING':
      return {
        ...state,
        mode: 'docking_anim',
        targetProtein: action.target,
        sequences: action.sequences,
        queryId: action.queryId,
        dockingCandidates: [],
        selectedCandidate: null,
        animationPhase: 'approach',
        statusMessage: `Screening peptides against ${action.target}...`,
      };

    case 'UPDATE_DOCKING_ANIMATION':
      return { ...state, animationPhase: action.phase };

    case 'SET_DOCKING_RESULTS':
      return {
        ...state,
        mode: 'docking_result',
        dockingCandidates: action.candidates,
        selectedCandidate: 0,
        animationPhase: 'bound',
        statusMessage: `Found ${action.candidates.length} candidate peptides`,
      };

    case 'SELECT_CANDIDATE': {
      const c = state.dockingCandidates[action.index];
      return {
        ...state,
        selectedCandidate: action.index,
        pdbData: c?.pdbData ?? state.pdbData,
        mode: c?.pdbData ? 'molecule_3d' : state.mode,
      };
    }

    case 'SET_STATUS':
      return { ...state, statusMessage: action.message };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AgentContextValue {
  vizState: VizState;
  dispatch: React.Dispatch<AgentAction>;
  /** AI 解析 SSE tool_call 指令并分发（含自动 PDB 拉取） */
  handleToolCall: (toolName: string, args: Record<string, unknown>) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [vizState, dispatch] = useReducer(vizReducer, initialState);

  // tRPC query utility for PDB fetching (imperative via utils)
  const trpcUtils = trpc.useUtils();

  const handleToolCall = useCallback((toolName: string, args: Record<string, unknown>) => {
    switch (toolName) {
      case 'show_molecule': {
        const name = (args.name as string) || 'Unknown';
        const sequence = args.sequence as string | undefined;
        const inlinePdbData = args.pdb_data as string | undefined;
        // Extract PDB ID if AI provided one (e.g. "2NAL")
        const pdbIdMatch = name.match(/\b([A-Z0-9]{4})\b/) ?? (args.pdb_id as string | undefined);
        const explicitPdbId = typeof pdbIdMatch === 'string' ? pdbIdMatch : pdbIdMatch?.[1];

        if (inlinePdbData && inlinePdbData.includes('ATOM')) {
          // AI provided inline PDB data — use it directly (likely simulated)
          dispatch({
            type: 'SHOW_MOLECULE',
            pdbData: inlinePdbData,
            name,
            sequence,
            isRealData: false,
          });
        } else {
          // No inline PDB data — fetch real structure from RCSB
          dispatch({ type: 'SET_PDB_LOADING', loading: true, name });

          // Detect if name looks like a sequence (all amino acid chars)
          const isSequenceQuery = sequence && /^[ACDEFGHIKLMNPQRSTVWY]{5,}$/i.test(sequence.trim());

          const fetchQuery = explicitPdbId
            ? trpcUtils.agent.fetchPdbStructure.fetch({ query: explicitPdbId, pdbId: explicitPdbId })
            : isSequenceQuery
            ? trpcUtils.agent.fetchPdbStructure.fetch({ query: sequence!.trim(), isSequence: true })
            : trpcUtils.agent.fetchPdbStructure.fetch({ query: name });

          fetchQuery
            .then((result) => {
              if (result.pdbFileContent) {
                dispatch({
                  type: 'SHOW_MOLECULE',
                  pdbData: result.pdbFileContent,
                  name: result.entry?.title ?? name,
                  sequence: result.entry?.sequence ?? sequence,
                  isRealData: result.isRealData,
                  pdbId: result.entry?.pdbId,
                  rcsbUrl: result.entry?.rcsbUrl,
                });
              } else {
                // PDB file not available — show sequence-based fallback
                dispatch({
                  type: 'SHOW_MOLECULE',
                  pdbData: '',
                  name,
                  sequence,
                  isRealData: false,
                });
              }
            })
            .catch((err) => {
              console.error('[AgentContext] PDB fetch failed:', err);
              // Graceful fallback: show sequence-only view
              dispatch({
                type: 'SHOW_MOLECULE',
                pdbData: '',
                name,
                sequence,
                isRealData: false,
              });
            });
        }
        break;
      }

      case 'start_docking':
        dispatch({
          type: 'START_DOCKING',
          target: (args.target as string) || '',
          sequences: (args.sequences as string[]) || [],
          queryId: (args.query_id as number) || 0,
        });
        break;

      case 'update_animation':
        dispatch({
          type: 'UPDATE_DOCKING_ANIMATION',
          phase: (args.phase as 'approach' | 'binding' | 'bound') || 'approach',
        });
        break;

      case 'show_docking_results':
        dispatch({
          type: 'SET_DOCKING_RESULTS',
          candidates: (args.candidates as DockingCandidate[]) || [],
        });
        break;

      case 'set_status':
        dispatch({ type: 'SET_STATUS', message: args.message as string });
        break;

      default:
        console.warn('[AgentContext] Unknown tool_call:', toolName, args);
    }
  }, [trpcUtils]);

  return (
    <AgentContext.Provider value={{ vizState, dispatch, handleToolCall }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}
