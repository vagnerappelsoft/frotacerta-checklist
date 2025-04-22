import Image from "next/image"

interface LogoProps {
  width?: number
  height?: number
  className?: string
}

export function Logo({ width = 64, height = 72, className = "" }: LogoProps) {
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image src="/logo.svg" alt="Frota Certa Logo" width={width} height={height} priority className="object-contain" />
    </div>
  )
}
