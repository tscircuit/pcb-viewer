import { useGlobalStore } from "global-store"
import { useEffect } from "react"
import {
  toast as ogToast,
  ToastContainer as OgToastContainer,
} from "react-toastify"
import { injectStyle } from "react-toastify/dist/inject-style"

export const useToast = () => {
  const pcb_viewer_id = useGlobalStore((s) => s.pcb_viewer_id)
  const toast = (message: string, opts?: Parameters<typeof ogToast>[1]) =>
    ogToast(message, {
      containerId: pcb_viewer_id,
      ...opts,
    })

  toast.error = (message: string, opts?: Parameters<typeof ogToast.error>[1]) =>
    ogToast.error(message, {
      containerId: pcb_viewer_id,
      ...opts,
    })

  // TODO add container id to this
  toast.promise = ogToast.promise

  return toast as typeof ogToast
}

export const ToastContainer = () => {
  useEffect(() => {
    injectStyle()
  }, [])
  const pcb_viewer_id = useGlobalStore((s) => s.pcb_viewer_id)
  return <OgToastContainer position="top-center" containerId={pcb_viewer_id} />
}
