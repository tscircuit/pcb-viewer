import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import React, { useEffect, useRef, useState } from "react"
import * as THREE from "three"

interface Props {
  circuitJson: AnyCircuitElement[]
  width?: number
  height?: number
  /** PCB thickness in mm, default 1.6 */
  boardThickness?: number
}

export const PcbBoxViewer = ({
  circuitJson,
  width = 600,
  height = 400,
  boardThickness = 1.6,
}: Props) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mountRef.current) return

    let animFrameId: number
    let renderer: THREE.WebGLRenderer | null = null

    const init = async () => {
      try {
        setLoading(true)

        const svgString = convertCircuitJsonToPcbSvg(circuitJson, {
          width: 1024,
          height: 1024,
        })

        let textureUrl: string
        try {
          const { Resvg, initWasm } = await import("@resvg/resvg-wasm")
          try {
            await initWasm(
              fetch(
                new URL(
                  "@resvg/resvg-wasm/index_bg.wasm",
                  import.meta.url,
                ).toString(),
              ),
            )
          } catch {
            // already initialized
          }
          const resvg = new Resvg(svgString, {
            fitTo: { mode: "width", value: 1024 },
          })
          const pngData = resvg.render()
          const pngBuffer = pngData.asPng()
          const blob = new Blob([pngBuffer as unknown as ArrayBuffer], {
            type: "image/png",
          })
          textureUrl = URL.createObjectURL(blob)
        } catch {
          const encoded = encodeURIComponent(svgString)
          textureUrl = `data:image/svg+xml,${encoded}`
        }

        const textureLoader = new THREE.TextureLoader()
        const pcbTexture = await new Promise<THREE.Texture>(
          (resolve, reject) => {
            textureLoader.load(textureUrl, resolve, undefined, reject)
          },
        )
        pcbTexture.colorSpace = THREE.SRGBColorSpace

        const boardEl = circuitJson.find((e) => e.type === "pcb_board") as
          | { width?: number; height?: number; thickness?: number }
          | undefined

        const boardW = boardEl?.width ?? 30
        const boardH = boardEl?.height ?? 20
        const boardD = boardEl?.thickness ?? boardThickness
        const scale = 4 / Math.max(boardW, boardH)
        const w = boardW * scale
        const h = boardD * scale * 3
        const d = boardH * scale

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x1a1a2e)

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
        camera.position.set(3, 2.5, 3)
        camera.lookAt(0, 0, 0)

        renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        mountRef.current!.appendChild(renderer.domElement)

        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x1a472a,
          roughness: 0.6,
          metalness: 0.1,
        })

        const topMat = new THREE.MeshStandardMaterial({
          map: pcbTexture,
          roughness: 0.4,
          metalness: 0.15,
        })

        const materials = [
          bodyMat,
          bodyMat,
          topMat,
          bodyMat,
          bodyMat,
          bodyMat,
        ]

        const geometry = new THREE.BoxGeometry(w, h, d)
        const mesh = new THREE.Mesh(geometry, materials)
        scene.add(mesh)

        scene.add(new THREE.AmbientLight(0xffffff, 0.6))
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
        dirLight.position.set(5, 8, 5)
        scene.add(dirLight)

        const fillLight = new THREE.DirectionalLight(0x4466ff, 0.3)
        fillLight.position.set(-3, -4, -3)
        scene.add(fillLight)

        setLoading(false)

        const animate = () => {
          animFrameId = requestAnimationFrame(animate)
          mesh.rotation.y += 0.005
          mesh.rotation.x = 0.25
          renderer!.render(scene, camera)
        }
        animate()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    }

    init()

    return () => {
      cancelAnimationFrame(animFrameId)
      renderer?.dispose()
      if (mountRef.current) {
        const canvas = mountRef.current.querySelector("canvas")
        canvas?.remove()
      }
    }
  }, [circuitJson, width, height, boardThickness])

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        backgroundColor: "#1a1a2e",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div ref={mountRef} style={{ width, height }} />
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#aaa",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          Generating PCB texture…
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f66",
            fontSize: 13,
            padding: 16,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}

export default PcbBoxViewer
