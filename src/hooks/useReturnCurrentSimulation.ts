import { useCallback, useEffect, useRef, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import type {
  ReturnCurrentSimulationClient,
  ReturnCurrentSimulationJob,
  ReturnCurrentSimulationJobStatus,
  ReturnCurrentSimulationRequest,
} from "../lib/return-current-client"

interface RunState<Result> {
  status: ReturnCurrentSimulationJobStatus | "idle"
  requestId?: string
  message: string
  result?: Result
  error?: string
  failureKind?: "submission" | "transport" | "solver" | "result"
}

const idle = {
  status: "idle" as const,
  message: "Ready to configure an EM run.",
}

/** Observes one server job even while its dialog is hidden. Closing the dialog
 * never cancels an EM solve; unmounting only aborts this browser's requests.
 */
export function useReturnCurrentSimulation<Result>({
  client,
  processResult,
}: {
  client: ReturnCurrentSimulationClient
  processResult: (
    circuitJson: AnyCircuitElement[],
    request?: ReturnCurrentSimulationRequest,
  ) => Promise<Result> | Result
}) {
  const [state, setState] = useState<RunState<Result>>(idle)
  const generation = useRef(0)
  const controller = useRef<AbortController | undefined>(undefined)
  const submitted = useRef<ReturnCurrentSimulationRequest | undefined>(
    undefined,
  )
  const processResultRef = useRef(processResult)
  processResultRef.current = processResult

  const stopObserving = useCallback(() => {
    generation.current++
    controller.current?.abort()
  }, [])

  useEffect(() => {
    submitted.current = undefined
    setState(idle)
    return stopObserving
  }, [client, stopObserving])

  const observe = useCallback(
    async (
      requestId: string,
      currentGeneration: number,
      signal: AbortSignal,
      firstJob?: ReturnCurrentSimulationJob,
    ) => {
      const isCurrent = () =>
        !signal.aborted && generation.current === currentGeneration
      let nextJob = firstJob
      let failureKind: RunState<Result>["failureKind"] = "transport"
      try {
        while (isCurrent()) {
          const job = nextJob ?? (await client.getJob(requestId, { signal }))
          nextJob = undefined
          if (!isCurrent()) return
          if (job.requestId !== requestId)
            throw new Error("The server returned a different simulation job.")
          if (job.status === "failed") {
            setState({
              requestId,
              status: "failed",
              message: job.message || "The EM solver failed.",
              error: job.message || "The EM solver failed.",
              failureKind: "solver",
            })
            return
          }
          if (job.status === "completed") {
            setState({
              requestId,
              status: "running",
              message: "Loading and validating the EM result…",
            })
            failureKind = "result"
            const circuitJson = await client.loadResult(job, { signal })
            if (!isCurrent()) return
            const result = await processResultRef.current(
              circuitJson,
              submitted.current?.requestId === requestId
                ? submitted.current
                : undefined,
            )
            if (!isCurrent()) return
            setState({
              requestId,
              status: "completed",
              message: "EM result ready to inspect on the PCB.",
              result,
            })
            return
          }
          setState({
            requestId,
            status: job.status,
            message:
              job.message ||
              (job.status === "queued"
                ? "Waiting for the EM solver…"
                : "Running the EM field solver…"),
          })
          await new Promise<void>((resolve) => {
            const finish = () => {
              clearTimeout(timer)
              signal.removeEventListener("abort", finish)
              resolve()
            }
            const timer = setTimeout(finish, 1_000)
            signal.addEventListener("abort", finish, { once: true })
          })
        }
      } catch (error) {
        if (!isCurrent()) return
        const message =
          error instanceof Error
            ? error.message
            : "Could not load the simulation job."
        setState({
          requestId,
          status: "failed",
          message,
          error: message,
          failureKind,
        })
      }
    },
    [client],
  )

  const resume = useCallback(
    (requestId: string) => {
      stopObserving()
      const currentController = new AbortController()
      controller.current = currentController
      const currentGeneration = generation.current
      setState({
        requestId,
        status: "queued",
        message: "Reconnecting to the simulation job…",
      })
      void observe(requestId, currentGeneration, currentController.signal)
    },
    [observe, stopObserving],
  )

  const submit = useCallback(
    async (request: ReturnCurrentSimulationRequest) => {
      stopObserving()
      const currentController = new AbortController()
      controller.current = currentController
      const currentGeneration = generation.current
      submitted.current = request
      setState({
        requestId: request.requestId,
        status: "queued",
        message: "Submitting the EM experiment…",
      })
      try {
        const job = await client.submit(request, {
          signal: currentController.signal,
        })
        if (
          currentController.signal.aborted ||
          generation.current !== currentGeneration
        )
          return
        await observe(
          request.requestId,
          currentGeneration,
          currentController.signal,
          job,
        )
      } catch (error) {
        if (
          currentController.signal.aborted ||
          generation.current !== currentGeneration
        )
          return
        const message =
          error instanceof Error
            ? error.message
            : "Could not submit the simulation."
        setState({
          requestId: request.requestId,
          status: "failed",
          message,
          error: message,
          failureKind: "submission",
        })
      }
    },
    [client, observe, stopObserving],
  )

  const reset = useCallback(() => {
    stopObserving()
    submitted.current = undefined
    setState(idle)
  }, [stopObserving])

  const retrySubmission = useCallback(() => {
    if (submitted.current) void submit(submitted.current)
  }, [submit])

  return {
    ...state,
    submit,
    resume,
    reset,
    retrySubmission,
    busy: state.status === "queued" || state.status === "running",
  }
}
