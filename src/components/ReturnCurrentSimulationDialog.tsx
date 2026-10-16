import {
  type AnyCircuitElement,
  type LayerRef,
  type SimulationReturnCurrentExcitation,
  layer_ref,
  simulation_experiment,
  simulation_pcb_return_current_field,
  simulation_pcb_return_current_heatmap,
  simulation_pcb_return_current_result,
  simulation_return_current_excitation,
} from "circuit-json"
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { useReturnCurrentSimulation } from "../hooks/useReturnCurrentSimulation"
import { getCopperLayerRefsFromElements } from "../lib/copper-layers"
import type {
  ReturnCurrentSimulationClient,
  ReturnCurrentSimulationJobStatus,
  ReturnCurrentSimulationRequest,
} from "../lib/return-current-client"
import {
  createReturnCurrentExperimentFromTrace,
  getReturnCurrentGroundCandidates,
  getReturnCurrentTraceTerminals,
  type ReturnCurrentPortCandidate,
} from "../lib/return-current-experiment"
import { loadReturnCurrentFields } from "../lib/return-current-overlay"

export interface ReturnCurrentSimulationDialogResult {
  circuitJson: AnyCircuitElement[]
  resultId: string
  pcbTraceId: string
  frequencyHz: number
  layer: LayerRef
  requestId: string
  showHeatmap: boolean
  showVectors: boolean
  opacity: number
}

export interface ReturnCurrentSimulationDialogProps {
  open: boolean
  pcbTraceId?: string
  circuitJson: AnyCircuitElement[]
  client: ReturnCurrentSimulationClient
  resumeRequestId?: string
  onClose: () => void
  onResult: (result: ReturnCurrentSimulationDialogResult) => void
  onRequestIdChange?: (id: string) => void
  onStatusChange?: (status: ReturnCurrentSimulationJobStatus | "idle") => void
}

interface FormState {
  driver: string
  ground: string
  returnSink: string
  returnSinkLayer: string
  returnSource: string
  returnSourceLayer: string
  frequencyMHz: string
  currentMa: string
  sourceResistance: string
  loadResistance: string
  sampleLayer: LayerRef
  cellSize: string
  meshSize: string
  order: 1 | 2
  airPadding: string
  processes: string
}

interface CompletedSimulation {
  circuitJson: AnyCircuitElement[]
  resultId: string
  pcbTraceId: string
  frequencyHz: number
  layers: LayerRef[]
  preferredLayer: LayerRef
  excitation: SimulationReturnCurrentExcitation
  resumed: boolean
}

const controlStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #4a606a",
  borderRadius: 5,
  background: "#10232b",
  color: "#f2f7f8",
  font: "inherit",
  minHeight: 36,
}
const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: 14,
}
const buttonStyle: CSSProperties = {
  ...controlStyle,
  width: "auto",
  cursor: "pointer",
  background: "#17616c",
}

const componentForPort = (
  circuitJson: AnyCircuitElement[],
  sourcePortId: string,
) => {
  const matches = circuitJson.filter(
    (element) =>
      element.type === "source_port" && element.source_port_id === sourcePortId,
  )
  return matches.length === 1 && matches[0].type === "source_port"
    ? matches[0].source_component_id
    : undefined
}

function uniqueGroundOnComponent(
  circuitJson: AnyCircuitElement[],
  candidates: ReturnCurrentPortCandidate[],
  signal: ReturnCurrentPortCandidate,
) {
  const componentId = componentForPort(circuitJson, signal.sourcePortId)
  if (!componentId) return undefined
  const matches = candidates.filter(
    (candidate) =>
      candidate.pcbPortId !== signal.pcbPortId &&
      componentForPort(circuitJson, candidate.sourcePortId) === componentId,
  )
  return matches.length === 1 ? matches[0] : undefined
}

function contactDefaults(
  circuitJson: AnyCircuitElement[],
  pcbTraceId: string,
  ground: string,
  driver: string,
) {
  const terminals = getReturnCurrentTraceTerminals(circuitJson, pcbTraceId)
  const source =
    driver === terminals.sourcePcbPortId ? terminals.source : terminals.load
  const load =
    driver === terminals.sourcePcbPortId ? terminals.load : terminals.source
  const candidates = getReturnCurrentGroundCandidates(
    circuitJson,
    ground,
  ).filter(
    (candidate) =>
      candidate.pcbPortId !== terminals.sourcePcbPortId &&
      candidate.pcbPortId !== terminals.loadPcbPortId,
  )
  const sink = uniqueGroundOnComponent(circuitJson, candidates, source)
  const returnSource = uniqueGroundOnComponent(circuitJson, candidates, load)
  return {
    returnSink: sink?.pcbPortId ?? "",
    returnSinkLayer: sink?.layers.length === 1 ? sink.layers[0] : "",
    returnSource: returnSource?.pcbPortId ?? "",
    returnSourceLayer:
      returnSource?.layers.length === 1 ? returnSource.layers[0] : "",
  }
}

function defaultForm(
  circuitJson: AnyCircuitElement[],
  pcbTraceId?: string,
): FormState {
  const initial: FormState = {
    driver: "",
    ground: "",
    returnSink: "",
    returnSinkLayer: "",
    returnSource: "",
    returnSourceLayer: "",
    frequencyMHz: "400",
    currentMa: "5",
    sourceResistance: "25",
    loadResistance: "100",
    sampleLayer: "bottom",
    cellSize: "0.01",
    meshSize: "0.5",
    order: 2,
    airPadding: "2",
    processes: "1",
  }
  if (!pcbTraceId) return initial
  try {
    const terminals = getReturnCurrentTraceTerminals(circuitJson, pcbTraceId)
    initial.driver = terminals.sourcePcbPortId
    const candidates = getReturnCurrentGroundCandidates(circuitJson)
    const groundIds = new Set(
      candidates.flatMap((candidate) =>
        candidate.sourceNets
          .filter((net) => net.isGround)
          .map((net) => net.sourceNetId),
      ),
    )
    if (groundIds.size === 1) {
      initial.ground = [...groundIds][0]
      Object.assign(
        initial,
        contactDefaults(
          circuitJson,
          pcbTraceId,
          initial.ground,
          initial.driver,
        ),
      )
      const pourLayers = [
        ...new Set(
          circuitJson.flatMap((element) =>
            element.type === "pcb_copper_pour" &&
            element.source_net_id === initial.ground
              ? [element.layer]
              : [],
          ),
        ),
      ]
      if (pourLayers.length === 1) initial.sampleLayer = pourLayers[0]
    }
  } catch {
    /* The dialog presents the endpoint diagnostic before submission. */
  }
  return initial
}

const positiveNumber = (value: string, label: string) => {
  if (!value.trim() || !Number.isFinite(Number(value)) || Number(value) <= 0)
    throw new Error(`${label} must be greater than zero.`)
  return Number(value)
}

const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_key, child) =>
    child && typeof child === "object" && !Array.isArray(child)
      ? Object.fromEntries(
          Object.keys(child)
            .sort()
            .map((key) => [key, child[key]]),
        )
      : child,
  )
const physicalBoardSignature = (circuitJson: readonly AnyCircuitElement[]) =>
  circuitJson
    .filter(
      (element) =>
        element.type.startsWith("pcb_") ||
        [
          "source_trace",
          "source_net",
          "source_port",
          "source_component",
        ].includes(element.type),
    )
    .map(canonicalJson)
    .sort()
    .join("\n")

/** Configures and observes a real solver job. Hiding the dialog preserves both
 * the form and the job; no source code or original PCB records are modified.
 */
export const ReturnCurrentSimulationDialog = ({
  open,
  pcbTraceId,
  circuitJson,
  client,
  resumeRequestId,
  onClose,
  onResult,
  onRequestIdChange,
  onStatusChange,
}: ReturnCurrentSimulationDialogProps) => {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({
    onResult,
    onRequestIdChange,
    onStatusChange,
    onClose,
  })
  callbacks.current = { onResult, onRequestIdChange, onStatusChange, onClose }
  const [sessionTraceId, setSessionTraceId] = useState(pcbTraceId ?? "")
  const [form, setForm] = useState(() => defaultForm(circuitJson, pcbTraceId))
  const [formError, setFormError] = useState("")
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showVectors, setShowVectors] = useState(true)
  const [opacity, setOpacity] = useState(0.65)
  const [resultLayer, setResultLayer] = useState<LayerRef>()
  const [health, setHealth] = useState<{
    available: boolean
    message: string
  }>()
  const [healthAttempt, setHealthAttempt] = useState(0)
  const latestBoard = useRef(circuitJson)
  latestBoard.current = circuitJson
  const expectedTrace = useRef(sessionTraceId)
  expectedTrace.current = sessionTraceId

  const processResult = useCallback(
    async (
      output: AnyCircuitElement[],
      request?: ReturnCurrentSimulationRequest,
    ): Promise<CompletedSimulation> => {
      if (
        physicalBoardSignature(output) !==
        physicalBoardSignature(latestBoard.current)
      )
        throw new Error(
          "This simulation belongs to a different or changed PCB. Run a new experiment for the current board.",
        )
      const results = output
        .filter(
          (element) => element.type === "simulation_pcb_return_current_result",
        )
        .map((element) => simulation_pcb_return_current_result.parse(element))
        .filter(
          (result) =>
            !request ||
            (result.simulation_experiment_id === request.experimentId &&
              result.frequency_hz === request.frequencyHz),
        )
        .filter(
          (result) =>
            !expectedTrace.current ||
            output.some(
              (element) =>
                element.type === "simulation_return_current_excitation" &&
                element.pcb_trace_id === expectedTrace.current &&
                result.simulation_return_current_excitation_ids.includes(
                  element.simulation_return_current_excitation_id,
                ),
            ),
        )
      if (results.length !== 1)
        throw new Error(
          "The result does not uniquely match the requested experiment, trace and frequency.",
        )
      const result = results[0]
      const boards = latestBoard.current.filter(
        (element) => element.type === "pcb_board",
      )
      if (boards.length !== 1 || result.pcb_board_id !== boards[0].pcb_board_id)
        throw new Error("The returned result references a different PCB board.")
      const experiments = output.filter(
        (element) =>
          element.type === "simulation_experiment" &&
          element.simulation_experiment_id === result.simulation_experiment_id,
      )
      if (
        experiments.length !== 1 ||
        simulation_experiment.parse(experiments[0]).experiment_type !==
          "pcb_return_current"
      )
        throw new Error("The result has no matching return-current experiment.")
      if (
        !result.frequency_hz ||
        result.frequency_hz <= 0 ||
        !Number.isFinite(result.frequency_hz)
      )
        throw new Error("The returned EM result has no valid frequency.")
      if (result.simulation_return_current_excitation_ids.length !== 1)
        throw new Error(
          "The result must contain exactly the selected trace excitation.",
        )
      const excitations = output.filter(
        (element) =>
          element.type === "simulation_return_current_excitation" &&
          result.simulation_return_current_excitation_ids.includes(
            element.simulation_return_current_excitation_id,
          ),
      )
      if (excitations.length !== 1)
        throw new Error("The returned result has no unique trace excitation.")
      const excitation = simulation_return_current_excitation.parse(
        excitations[0],
      )
      if (
        excitation.simulation_experiment_id !== result.simulation_experiment_id
      )
        throw new Error(
          "The result and excitation reference different experiments.",
        )
      if (request) {
        const submitted = request.circuitJson.filter(
          (element) =>
            element.type === "simulation_return_current_excitation" &&
            element.simulation_experiment_id === request.experimentId,
        )
        if (
          submitted.length !== 1 ||
          canonicalJson(
            simulation_return_current_excitation.parse(submitted[0]),
          ) !== canonicalJson(excitation)
        )
          throw new Error(
            "The returned result changed the submitted current, trace or physical return contacts.",
          )
      }
      if (
        !excitation.source_port ||
        !excitation.load_port ||
        excitation.return_source.contact_type !== "pcb_port" ||
        excitation.return_sink.contact_type !== "pcb_port"
      )
        throw new Error(
          "The result needs explicit driver, load and physical ground pad terminals.",
        )
      // Reuse the same final physical/connectivity validator when recovering a job.
      const validated = createReturnCurrentExperimentFromTrace({
        circuitJson: latestBoard.current,
        pcbTraceId: excitation.pcb_trace_id,
        sourcePcbPortId: excitation.source_port.signal_pcb_port_id,
        loadPcbPortId: excitation.load_port.signal_pcb_port_id,
        returnSourcePcbPortId: excitation.return_source.pcb_port_id,
        returnSinkPcbPortId: excitation.return_sink.pcb_port_id,
        groundSourceNetId: excitation.ground_source_net_id,
        sourceCurrentA: excitation.current,
        sourceResistanceOhms: excitation.source_port.resistance,
        loadResistanceOhms: excitation.load_port.resistance,
        returnSourceLayer: excitation.return_source.layer,
        returnSinkLayer: excitation.return_sink.layer,
      }).circuitJson.at(-1)
      if (
        validated?.type !== "simulation_return_current_excitation" ||
        canonicalJson([
          validated.return_source,
          validated.return_sink,
          validated.source_port,
          validated.load_port,
        ]) !==
          canonicalJson([
            excitation.return_source,
            excitation.return_sink,
            excitation.source_port,
            excitation.load_port,
          ])
      )
        throw new Error(
          "The recovered physical terminals no longer match the PCB.",
        )
      const layers = [
        ...new Set(
          output.flatMap((element) => {
            if (
              element.type === "simulation_pcb_return_current_field" &&
              element.simulation_pcb_return_current_result_id ===
                result.simulation_pcb_return_current_result_id
            )
              return [simulation_pcb_return_current_field.parse(element).layer]
            if (
              element.type === "simulation_pcb_return_current_heatmap" &&
              element.simulation_pcb_return_current_result_id ===
                result.simulation_pcb_return_current_result_id
            ) {
              const heatmap =
                simulation_pcb_return_current_heatmap.parse(element)
              if (!/^data:image\/(png|webp)[;,]/i.test(heatmap.image_asset.url))
                throw new Error(
                  "Return-current images must be embedded in Circuit JSON.",
                )
              return [heatmap.layer]
            }
            return []
          }),
        ),
      ]
      if (!layers.length)
        throw new Error("The completed result has no field or heatmap layers.")
      if (request && !layers.includes(request.sampleLayer))
        throw new Error(
          "The completed result does not contain the requested return layer.",
        )
      await Promise.all(
        layers.map((layer) =>
          loadReturnCurrentFields(
            output,
            result.simulation_pcb_return_current_result_id,
            layer,
          ),
        ),
      )
      const preferredLayer =
        request?.sampleLayer && layers.includes(request.sampleLayer)
          ? request.sampleLayer
          : layers[0]
      return {
        circuitJson: output,
        resultId: result.simulation_pcb_return_current_result_id,
        pcbTraceId: excitation.pcb_trace_id,
        frequencyHz: result.frequency_hz,
        layers,
        preferredLayer,
        excitation,
        resumed: !request,
      }
    },
    [],
  )

  const run = useReturnCurrentSimulation({ client, processResult })
  useEffect(() => {
    callbacks.current.onStatusChange?.(run.status)
  }, [run.status])
  useEffect(() => {
    if (run.requestId) callbacks.current.onRequestIdChange?.(run.requestId)
  }, [run.requestId])
  const resumed = useRef<
    { client: ReturnCurrentSimulationClient; requestId: string } | undefined
  >(undefined)
  useEffect(() => {
    if (
      resumeRequestId &&
      (resumed.current?.requestId !== resumeRequestId ||
        resumed.current.client !== client)
    ) {
      const clientChanged =
        resumed.current !== undefined && resumed.current.client !== client
      resumed.current = { client, requestId: resumeRequestId }
      // A host may echo onRequestIdChange through its URL-backed resume prop.
      // That acknowledgement must not abort a submission already in progress.
      if (clientChanged || run.requestId !== resumeRequestId)
        run.resume(resumeRequestId)
    }
  }, [client, resumeRequestId, run.requestId, run.resume])

  useEffect(() => {
    if (!pcbTraceId || pcbTraceId === sessionTraceId || run.busy) return
    setSessionTraceId(pcbTraceId)
    if (run.result?.pcbTraceId === pcbTraceId) return
    run.reset()
    setForm(defaultForm(circuitJson, pcbTraceId))
    setFormError("")
    setResultLayer(undefined)
  }, [pcbTraceId, sessionTraceId, run.busy, run.result, run.reset, circuitJson])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    let active = true
    setHealth(undefined)
    void client
      .checkAvailability({ signal: controller.signal })
      .then((availability) => {
        if (active && !controller.signal.aborted) setHealth(availability)
      })
      .catch((error) => {
        if (active && !controller.signal.aborted)
          setHealth({
            available: false,
            message:
              error instanceof Error
                ? error.message
                : "The simulation backend is unavailable.",
          })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [open, client, healthAttempt])

  useLayoutEffect(() => {
    if (!open) return
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        callbacks.current.onClose()
      } else if (!dialogRef.current?.contains(document.activeElement)) {
        // Disabling the submit button may make the browser focus the body.
        // Keep its next key press inside the modal rather than the PCB hotkeys.
        event.stopPropagation()
        if (event.key === "Tab") event.preventDefault()
        dialogRef.current?.focus()
      }
    }
    let focusFrame: number | undefined
    const containFocus = () => {
      if (!dialogRef.current?.contains(document.activeElement))
        dialogRef.current?.focus()
    }
    const onFocusOut = () => {
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
      focusFrame = requestAnimationFrame(containFocus)
    }
    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("focusin", containFocus, true)
    document.addEventListener("focusout", onFocusOut, true)
    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("focusin", containFocus, true)
      document.removeEventListener("focusout", onFocusOut, true)
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const active = document.activeElement
    if (
      !dialogRef.current?.contains(active) ||
      (active instanceof HTMLElement && active.matches(":disabled"))
    )
      dialogRef.current?.focus()
  }, [open, run.status, health])

  useEffect(() => {
    const result = run.result
    if (!result) return
    setResultLayer(result.preferredLayer)
    if (!sessionTraceId) setSessionTraceId(result.pcbTraceId)
    if (result.resumed) {
      const excitation = result.excitation
      setForm((previous) => ({
        ...previous,
        driver: excitation.source_port!.signal_pcb_port_id,
        ground: excitation.ground_source_net_id,
        returnSource:
          excitation.return_source.contact_type === "pcb_port"
            ? excitation.return_source.pcb_port_id
            : "",
        returnSourceLayer: excitation.return_source.layer,
        returnSink:
          excitation.return_sink.contact_type === "pcb_port"
            ? excitation.return_sink.pcb_port_id
            : "",
        returnSinkLayer: excitation.return_sink.layer,
        frequencyMHz: String(result.frequencyHz / 1e6),
        currentMa: String(excitation.current * 1e3),
        sourceResistance: String(excitation.source_port!.resistance),
        loadResistance: String(excitation.load_port!.resistance),
        sampleLayer: result.preferredLayer,
      }))
    }
  }, [run.result])

  const selectedResultLayer =
    resultLayer && run.result?.layers.includes(resultLayer)
      ? resultLayer
      : run.result?.preferredLayer
  useEffect(() => {
    if (!run.result || !run.requestId || !selectedResultLayer) return
    callbacks.current.onResult({
      circuitJson: run.result.circuitJson,
      resultId: run.result.resultId,
      pcbTraceId: run.result.pcbTraceId,
      frequencyHz: run.result.frequencyHz,
      requestId: run.requestId,
      layer: selectedResultLayer,
      showHeatmap,
      showVectors,
      opacity,
    })
  }, [
    run.result,
    run.requestId,
    selectedResultLayer,
    showHeatmap,
    showVectors,
    opacity,
  ])

  const setup = useMemo(() => {
    try {
      if (!sessionTraceId)
        return { error: "Choose a routed signal trace on the PCB." }
      return {
        terminals: getReturnCurrentTraceTerminals(circuitJson, sessionTraceId),
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "The selected trace is not supported.",
      }
    }
  }, [circuitJson, sessionTraceId])
  const allGroundCandidates = useMemo(
    () => getReturnCurrentGroundCandidates(circuitJson),
    [circuitJson],
  )
  const groundNets = useMemo(
    () => [
      ...new Map(
        allGroundCandidates
          .flatMap((candidate) => candidate.sourceNets)
          .map((net) => [net.sourceNetId, net]),
      ).values(),
    ],
    [allGroundCandidates],
  )
  const groundCandidates = allGroundCandidates.filter(
    (candidate) =>
      candidate.sourceNetIds.includes(form.ground) &&
      candidate.pcbPortId !== setup.terminals?.sourcePcbPortId &&
      candidate.pcbPortId !== setup.terminals?.loadPcbPortId,
  )
  const boardLayers = getCopperLayerRefsFromElements(circuitJson)
  const sink = groundCandidates.find(
    (candidate) => candidate.pcbPortId === form.returnSink,
  )
  const returnSource = groundCandidates.find(
    (candidate) => candidate.pcbPortId === form.returnSource,
  )
  const driver =
    form.driver === setup.terminals?.sourcePcbPortId
      ? setup.terminals?.source
      : setup.terminals?.load
  const load =
    form.driver === setup.terminals?.sourcePcbPortId
      ? setup.terminals?.load
      : setup.terminals?.source

  const setValue = <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => setForm((previous) => ({ ...previous, [key]: value }))
  const chooseContacts = (ground: string, selectedDriver: string) => {
    const defaults =
      ground && sessionTraceId
        ? contactDefaults(circuitJson, sessionTraceId, ground, selectedDriver)
        : {
            returnSource: "",
            returnSink: "",
            returnSourceLayer: "",
            returnSinkLayer: "",
          }
    setForm((previous) => ({
      ...previous,
      ground,
      driver: selectedDriver,
      ...defaults,
    }))
  }

  const start = () => {
    if (run.busy) return
    setFormError("")
    if (run.failureKind === "submission") {
      run.retrySubmission()
      return
    }
    if (run.status === "failed" && run.failureKind !== "solver") {
      if (run.requestId) run.resume(run.requestId)
      return
    }
    try {
      if (!health?.available)
        throw new Error(
          "Connect to the simulation backend before starting a run.",
        )
      if (!setup.terminals || !driver || !load)
        throw new Error(setup.error || "Choose a supported signal trace.")
      if (!form.ground) throw new Error("Choose the ground reference net.")
      if (!form.returnSink || !form.returnSource)
        throw new Error(
          "Choose both physical ground pads; ambiguous pads are never selected automatically.",
        )
      if (!form.returnSinkLayer || !form.returnSourceLayer)
        throw new Error("Choose a contact layer for each physical ground pad.")
      if (!boardLayers.includes(form.sampleLayer))
        throw new Error("Choose a return layer present on this PCB.")
      const experiment = createReturnCurrentExperimentFromTrace({
        circuitJson: structuredClone(circuitJson),
        pcbTraceId: sessionTraceId,
        sourcePcbPortId: driver.pcbPortId,
        loadPcbPortId: load.pcbPortId,
        returnSourcePcbPortId: form.returnSource,
        returnSinkPcbPortId: form.returnSink,
        groundSourceNetId: form.ground,
        sourceCurrentA: positiveNumber(form.currentMa, "Peak current") / 1e3,
        sourceResistanceOhms: positiveNumber(
          form.sourceResistance,
          "Source resistance",
        ),
        loadResistanceOhms: positiveNumber(
          form.loadResistance,
          "Load resistance",
        ),
        returnSourceLayer: layer_ref.parse(form.returnSourceLayer),
        returnSinkLayer: layer_ref.parse(form.returnSinkLayer),
      })
      const processes = positiveNumber(form.processes, "Solver processes")
      if (!Number.isInteger(processes) || processes > 4)
        throw new Error("Solver processes must be an integer from 1 to 4.")
      const request: ReturnCurrentSimulationRequest = {
        requestId: crypto.randomUUID(),
        circuitJson: experiment.circuitJson,
        experimentId: experiment.experimentId,
        frequencyHz: positiveNumber(
          String(positiveNumber(form.frequencyMHz, "Frequency") * 1e6),
          "Frequency",
        ),
        sampleLayer: layer_ref.parse(form.sampleLayer),
        cellSize: positiveNumber(form.cellSize, "Sampling cell size"),
        meshSize: positiveNumber(form.meshSize, "FEM mesh size"),
        order: form.order,
        airPadding: positiveNumber(form.airPadding, "Air padding"),
        processes,
        copperModel: "surface_impedance_copper",
      }
      setResultLayer(undefined)
      void run.submit(request)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The simulation settings are invalid.",
      )
    }
  }

  if (!open || typeof document === "undefined") return null
  const numberField = (
    label: string,
    key:
      | "frequencyMHz"
      | "currentMa"
      | "sourceResistance"
      | "loadResistance"
      | "cellSize"
      | "meshSize"
      | "airPadding"
      | "processes",
  ) => (
    <label>
      {label}
      <input
        style={controlStyle}
        type="number"
        min="0"
        step={key === "processes" ? "1" : "any"}
        value={form[key]}
        onChange={(event) => setValue(key, event.currentTarget.value)}
      />
    </label>
  )
  const layerField = (
    label: string,
    value: string,
    layers: LayerRef[],
    onChange: (value: string) => void,
  ) => (
    <label>
      {label}
      <select
        style={controlStyle}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">Choose contact layer</option>
        {layers.map((layer) => (
          <option key={layer} value={layer}>
            {layer}
          </option>
        ))}
      </select>
    </label>
  )
  const groundField = (
    label: string,
    key: "returnSink" | "returnSource",
    layerKey: "returnSinkLayer" | "returnSourceLayer",
  ) => (
    <label>
      {label}
      <select
        style={controlStyle}
        value={form[key]}
        onChange={(event) => {
          const value = event.currentTarget.value
          const candidate = groundCandidates.find(
            (port) => port.pcbPortId === value,
          )
          setForm((previous) => ({
            ...previous,
            [key]: value,
            [layerKey]:
              candidate?.layers.length === 1 ? candidate.layers[0] : "",
          }))
        }}
      >
        <option value="">Choose physical ground pad</option>
        {groundCandidates.map((port) => (
          <option key={port.pcbPortId} value={port.pcbPortId}>
            {port.label} · {port.layers.join(" / ")}
          </option>
        ))}
      </select>
    </label>
  )

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "#000a",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === "Escape") {
          event.preventDefault()
          onClose()
          return
        }
        if (event.key !== "Tab") return
        const focusable = [
          ...(dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]',
          ) ?? []),
        ].filter((element) => element.getClientRects().length > 0)
        const first = focusable[0],
          last = focusable.at(-1)
        if (!first) {
          event.preventDefault()
          dialogRef.current?.focus()
          return
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !focusable.includes(document.activeElement as HTMLElement))
        ) {
          event.preventDefault()
          last?.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !focusable.includes(document.activeElement as HTMLElement))
        ) {
          event.preventDefault()
          first.focus()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          width: "min(760px, 100%)",
          maxHeight: "min(90vh, 950px)",
          overflowY: "auto",
          color: "#edf5f8",
          background: "#142b33",
          border: "1px solid #54717e",
          borderRadius: 10,
          padding: 22,
          boxSizing: "border-box",
          font: "14px/1.45 system-ui, sans-serif",
          outline: "none",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            position: "sticky",
            top: 0,
            background: "#142b33",
            zIndex: 1,
            paddingBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <h2 id={titleId} style={{ margin: 0, fontSize: 22 }}>
            Return current simulation
          </h2>
          <button
            style={buttonStyle}
            type="button"
            aria-label="Close return current simulation"
            onClick={onClose}
          >
            Close
          </button>
          {run.result && (
            <button type="button" style={buttonStyle} onClick={onClose}>
              View result on PCB
            </button>
          )}
        </header>
        <p>
          {setup.terminals
            ? `${setup.terminals.source.label} ↔ ${setup.terminals.load.label}`
            : "Select a routed PCB connection."}
        </p>
        {setup.terminals && (
          <p style={{ color: "#afc6cf" }}>
            Signal net:{" "}
            {[
              ...new Set(
                [
                  ...setup.terminals.source.sourceNets,
                  ...setup.terminals.load.sourceNets,
                ].map((net) => net.label),
              ),
            ].join(", ") || "Point-to-point connection"}
          </p>
        )}
        <div
          data-testid="cli-health"
          role="status"
          style={{ marginBottom: 14 }}
        >
          {health
            ? health.available
              ? "Local CLI event server available"
              : `Simulation backend unavailable: ${health.message}`
            : "Checking simulation backend…"}
          {health && !health.available && (
            <button
              type="button"
              style={{ ...buttonStyle, marginLeft: 8 }}
              onClick={() => setHealthAttempt((value) => value + 1)}
            >
              Retry backend connection
            </button>
          )}
        </div>
        {setup.error && <p role="alert">{setup.error}</p>}
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            start()
          }}
        >
          <fieldset
            disabled={
              run.busy ||
              run.failureKind === "submission" ||
              run.failureKind === "transport" ||
              run.failureKind === "result"
            }
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <div style={gridStyle}>
              <label>
                Driver signal pad
                <select
                  style={controlStyle}
                  value={form.driver}
                  onChange={(event) =>
                    chooseContacts(form.ground, event.currentTarget.value)
                  }
                >
                  {!setup.terminals && (
                    <option value="">Choose signal trace</option>
                  )}
                  {setup.terminals &&
                    [setup.terminals.source, setup.terminals.load].map(
                      (port) => (
                        <option key={port.pcbPortId} value={port.pcbPortId}>
                          {port.label}
                        </option>
                      ),
                    )}
                </select>
              </label>
              <label>
                Ground net
                <select
                  style={controlStyle}
                  value={form.ground}
                  onChange={(event) =>
                    chooseContacts(event.currentTarget.value, form.driver)
                  }
                >
                  <option value="">Choose ground reference net</option>
                  {groundNets.map((net) => (
                    <option key={net.sourceNetId} value={net.sourceNetId}>
                      {net.label}
                      {net.isGround ? " (GND)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p>
              Signal: {driver?.label ?? "driver"} → {load?.label ?? "load"}.
              Return: load-side ground → driver-side ground.
            </p>
            <div style={gridStyle}>
              {groundField(
                "Driver-side ground pad",
                "returnSink",
                "returnSinkLayer",
              )}
              {layerField(
                "Driver-side ground layer",
                form.returnSinkLayer,
                sink?.layers ?? [],
                (value) => setValue("returnSinkLayer", value),
              )}
              {groundField(
                "Load-side ground pad",
                "returnSource",
                "returnSourceLayer",
              )}
              {layerField(
                "Load-side ground layer",
                form.returnSourceLayer,
                returnSource?.layers ?? [],
                (value) => setValue("returnSourceLayer", value),
              )}
              {numberField("Frequency (MHz)", "frequencyMHz")}
              {numberField("Peak current (mA)", "currentMa")}
              {numberField("Source resistance (Ω)", "sourceResistance")}
              {numberField("Load resistance (Ω)", "loadResistance")}
              <label>
                Return layer
                <select
                  style={controlStyle}
                  value={form.sampleLayer}
                  onChange={(event) =>
                    setValue(
                      "sampleLayer",
                      layer_ref.parse(event.currentTarget.value),
                    )
                  }
                >
                  {boardLayers.map((layer) => (
                    <option key={layer} value={layer}>
                      {layer}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <details style={{ marginTop: 18 }}>
              <summary style={{ cursor: "pointer" }}>
                Advanced solver settings
              </summary>
              <p>Frequency-domain EM with surface-impedance copper.</p>
              <div style={gridStyle}>
                {numberField("Sampling cell size (mm)", "cellSize")}
                {numberField("FEM mesh size (mm)", "meshSize")}
                <label>
                  FEM order
                  <select
                    style={controlStyle}
                    value={form.order}
                    onChange={(event) =>
                      setValue(
                        "order",
                        event.currentTarget.value === "2" ? 2 : 1,
                      )
                    }
                  >
                    <option value={1}>P1</option>
                    <option value={2}>P2</option>
                  </select>
                </label>
                {numberField("Air padding (mm)", "airPadding")}
                {numberField("Solver processes", "processes")}
              </div>
            </details>
          </fieldset>
          {formError && <p role="alert">{formError}</p>}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <button
              type="submit"
              style={{
                ...buttonStyle,
                opacity:
                  run.busy || !health?.available || !setup.terminals ? 0.55 : 1,
              }}
              disabled={
                run.busy ||
                !health?.available ||
                !setup.terminals ||
                (run.status === "failed" &&
                  run.failureKind !== "solver" &&
                  run.failureKind !== "submission")
              }
            >
              {run.busy
                ? "Simulation running…"
                : run.failureKind === "solver" ||
                    run.failureKind === "submission"
                  ? "Retry simulation"
                  : "Run simulation"}
            </button>
            {run.status === "failed" &&
              run.failureKind !== "solver" &&
              run.failureKind !== "submission" &&
              run.requestId && (
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => run.resume(run.requestId!)}
                >
                  Retry loading job
                </button>
              )}
          </div>
        </form>
        <div
          data-testid="simulation-status"
          data-status={run.status}
          role="status"
          aria-live="polite"
          style={{ marginTop: 14 }}
        >
          {run.status}: {run.message}
        </div>
        {run.error && <p role="alert">{run.error}</p>}
        {run.busy && (
          <p style={{ color: "#afc6cf" }}>
            You can close this dialog while the simulation continues.
          </p>
        )}
        {run.result && (
          <section
            aria-label="Simulation result display"
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid #48636f",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Result · {run.result.frequencyHz / 1e6} MHz
            </h3>
            <div
              style={{
                display: "flex",
                gap: 18,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(event) =>
                    setShowHeatmap(event.currentTarget.checked)
                  }
                />{" "}
                EM heatmap
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showVectors}
                  onChange={(event) =>
                    setShowVectors(event.currentTarget.checked)
                  }
                />{" "}
                Current direction arrows
              </label>
            </div>
            <div style={gridStyle}>
              <label>
                Result layer
                <select
                  style={controlStyle}
                  value={selectedResultLayer}
                  onChange={(event) =>
                    setResultLayer(layer_ref.parse(event.currentTarget.value))
                  }
                >
                  {run.result.layers.map((layer) => (
                    <option key={layer} value={layer}>
                      {layer}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Heat opacity
                <input
                  style={{ width: "100%" }}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(event) =>
                    setOpacity(Number(event.currentTarget.value))
                  }
                />
              </label>
            </div>
          </section>
        )}
      </div>
    </div>,
    document.body,
  )
}
