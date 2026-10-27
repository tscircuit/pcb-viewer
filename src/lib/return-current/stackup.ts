import { z } from "zod"

/** Physical dimensions in mm, ordered from top to bottom. */
export const returnCurrentStackupSchema = z
  .object({
    nominalBoardThicknessMm: z.number().finite().positive().max(5).optional(),
    layers: z
      .array(
        z.union([
          z
            .object({
              name: z.enum(["top", "inner1", "inner2", "bottom"]),
              copperThicknessMm: z.number().finite().positive().max(0.5),
            })
            .strict(),
          z
            .object({
              material: z.string().min(1).max(128),
              dielectricThicknessMm: z.number().finite().positive().max(5),
              dielectricConstant: z.number().finite().min(1).max(100),
              lossTangent: z.number().finite().min(0).max(1).optional(),
            })
            .strict(),
        ]),
      )
      .length(7),
  })
  .strict()
  .superRefine((stackup, ctx) => {
    const names = ["top", "inner1", "inner2", "bottom"]
    let thickness = 0
    stackup.layers.forEach((layer, index) => {
      if (
        index % 2 === 0
          ? !("name" in layer) || layer.name !== names[index / 2]
          : !("material" in layer)
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Alternate top, dielectric, inner1, dielectric, inner2, dielectric, bottom.",
        })
      thickness +=
        "name" in layer
          ? layer.copperThicknessMm
          : "dielectricThicknessMm" in layer
            ? layer.dielectricThicknessMm
            : 0
    })
    if (thickness > 5)
      ctx.addIssue({
        code: "custom",
        message: "Physical stackup must be at most 5 mm thick.",
      })
  })

export type ReturnCurrentStackup = z.infer<typeof returnCurrentStackupSchema>

// JLCPCB's default 1.2 mm / 1 oz outer / 0.5 oz inner option, retrieved
// 2026-10-27 from https://jlcpcb.com/impedance. These are published physical
// dimensions; their 1.1212 mm sum is deliberately NOT scaled to nominal 1.2 mm.
// Loss tangent is an explicit simulation assumption, not supplied by JLCPCB.
export const jlcpcbFourLayerStackup = (): ReturnCurrentStackup => ({
  nominalBoardThicknessMm: 1.2,
  layers: [
    { name: "top", copperThicknessMm: 0.035 },
    {
      material: "7628 prepreg",
      dielectricThicknessMm: 0.2104,
      dielectricConstant: 4.4,
      lossTangent: 0.02,
    },
    { name: "inner1", copperThicknessMm: 0.0152 },
    {
      material: "FR-4 core",
      dielectricThicknessMm: 0.6,
      dielectricConstant: 4.6,
      lossTangent: 0.02,
    },
    { name: "inner2", copperThicknessMm: 0.0152 },
    {
      material: "7628 prepreg",
      dielectricThicknessMm: 0.2104,
      dielectricConstant: 4.4,
      lossTangent: 0.02,
    },
    { name: "bottom", copperThicknessMm: 0.035 },
  ],
})

export const defaultReturnCurrentStackup = (
  numLayers?: number,
  thickness?: number,
) =>
  numLayers === 4 &&
  thickness !== undefined &&
  Math.abs(thickness - 1.2) < 0.0001
    ? JSON.stringify(jlcpcbFourLayerStackup(), null, 2)
    : ""
