import { ImageResponse } from "next/og"

// Route segment config
export const runtime = "edge"

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = "image/png"

// Image generation
export default function Icon() {
  return new ImageResponse(
    // ImageResponse JSX element
    <div
      style={{
        fontSize: 24,
        background: "white",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0B6FFF",
        fontWeight: "bold",
        borderRadius: "50%",
      }}
    >
      FC
    </div>,
    // ImageResponse options
    {
      // For convenience, we can re-use the exported opengraph-image
      // size config to also set the ImageResponse width and height.
      ...size,
    },
  )
}
