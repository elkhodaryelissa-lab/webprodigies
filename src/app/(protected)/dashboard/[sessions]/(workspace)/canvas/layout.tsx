import React from 'react'

type Props = {
  children: React.ReactNode
}

// The canvas is a full-bleed, edge-to-edge surface (unlike the
// style-guide page's constrained container), so this layout just passes
// children through — CanvasEditor itself handles fixed positioning under
// the navbar.
const Layout = ({ children }: Props) => {
  return <>{children}</>
}

export default Layout
