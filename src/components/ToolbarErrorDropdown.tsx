import { useCallback, useMemo, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { useCopyToClipboard } from "react-use"
import { useMobileTouch } from "hooks/useMobileTouch"
import { ToolbarButton } from "./ToolbarButton"

type ToolbarErrorElement = AnyCircuitElement & {
  error_type?: string
  message?: string
  pcb_trace_error_id?: string
}

const CopyErrorButton = ({
  errorId,
  errorMessage,
  copiedErrorId,
  onCopy,
}: {
  errorId: string
  errorMessage: string
  copiedErrorId: string | null
  onCopy: (errorMessage: string, errorId: string) => void
}) => {
  const { style: touchStyle, ...touchHandlers } = useMobileTouch(() =>
    onCopy(errorMessage, errorId),
  )

  return (
    <button
      type="button"
      aria-label={
        copiedErrorId === errorId
          ? "Error message copied"
          : "Copy error message"
      }
      style={{
        position: "absolute",
        top: 12,
        right: 16,
        cursor: "pointer",
        color: "#888",
        fontSize: 16,
        background: "none",
        border: "none",
        padding: 0,
        display: "flex",
        alignItems: "center",
        ...touchStyle,
      }}
      {...touchHandlers}
    >
      {copiedErrorId === errorId ? (
        <span style={{ color: "#4caf50", fontSize: 12 }}>Copied!</span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
        </svg>
      )}
    </button>
  )
}

interface ToolbarErrorDropdownProps {
  elements?: AnyCircuitElement[]
  isOpen: boolean
  isSmallScreen: boolean
  onToggle: () => void
  setHoveredErrorId: (errorId: string | null) => void
}

export const ToolbarErrorDropdown = ({
  elements,
  isOpen,
  isSmallScreen,
  onToggle,
  setHoveredErrorId,
}: ToolbarErrorDropdownProps) => {
  const [copiedErrorId, setCopiedErrorId] = useState<string | null>(null)
  const [collapsedErrorGroups, setCollapsedErrorGroups] = useState<Set<string>>(
    new Set(),
  )
  const [expandedErrorIds, setExpandedErrorIds] = useState<Set<string>>(
    new Set(),
  )
  const [, copyToClipboard] = useCopyToClipboard()

  const errorElements = useMemo(
    () =>
      elements?.filter((el): el is ToolbarErrorElement =>
        el.type.includes("error"),
      ) ?? [],
    [elements],
  )

  const errorCount = errorElements.length

  const getErrorId = useCallback(
    (error: ToolbarErrorElement, index: number) => {
      return (
        error.pcb_trace_error_id ||
        `error_${index}_${error.error_type}_${error.message?.slice(0, 20)}`
      )
    },
    [],
  )

  const groupedErrorElements = useMemo(() => {
    const groups = new Map<
      string,
      { error: ToolbarErrorElement; index: number; errorId: string }[]
    >()

    errorElements.forEach((error, index) => {
      const errorType = error.error_type || "unknown_error"
      const existingGroup = groups.get(errorType) || []
      existingGroup.push({
        error,
        index,
        errorId: getErrorId(error, index),
      })
      groups.set(errorType, existingGroup)
    })

    return Array.from(groups.entries()).map(([errorType, errors]) => ({
      errorType,
      errors,
    }))
  }, [errorElements, getErrorId])

  const toggleErrorGroup = useCallback((errorType: string) => {
    setCollapsedErrorGroups((prev) => {
      const next = new Set(prev)
      if (next.has(errorType)) {
        next.delete(errorType)
      } else {
        next.add(errorType)
      }
      return next
    })
  }, [])

  const toggleExpandedError = useCallback((errorId: string) => {
    setExpandedErrorIds((prev) => {
      const next = new Set(prev)
      if (next.has(errorId)) {
        next.delete(errorId)
      } else {
        next.add(errorId)
      }
      return next
    })
  }, [])

  return (
    <div style={{ position: "relative" }}>
      <ToolbarButton
        isSmallScreen={isSmallScreen}
        style={errorCount > 0 ? { color: "red" } : undefined}
        onClick={onToggle}
      >
        <div>{errorCount} errors</div>
      </ToolbarButton>
      {isOpen && errorCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            backgroundColor: "#2a2a2a",
            border: "1px solid #666",
            borderRadius: 4,
            marginTop: 4,
            zIndex: 1000,
            minWidth: isSmallScreen ? "280px" : "400px",
            maxWidth: isSmallScreen ? "90vw" : "600px",
            maxHeight: "400px",
            overflow: "auto",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          }}
        >
          {groupedErrorElements.map(({ errorType, errors }, groupIndex) => {
            const isGroupCollapsed = collapsedErrorGroups.has(errorType)

            return (
              <div
                key={errorType}
                style={{
                  borderBottom:
                    groupIndex < groupedErrorElements.length - 1
                      ? "1px solid #444"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    cursor: "pointer",
                    backgroundColor: "#232323",
                    transition: "background-color 0.2s ease",
                    touchAction: "manipulation",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#303030"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#232323"
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    e.currentTarget.style.backgroundColor = "#303030"
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    e.currentTarget.style.backgroundColor = "#232323"
                    toggleErrorGroup(errorType)
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleErrorGroup(errorType)
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#ff6b6b",
                    }}
                  >
                    <div
                      style={{
                        color: "#888",
                        fontSize: "16px",
                        transform: isGroupCollapsed
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      ›
                    </div>
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: isSmallScreen ? "12px" : "13px",
                      }}
                    >
                      {errorType}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: isSmallScreen ? "12px" : "13px",
                      color: "#aaa",
                      whiteSpace: "nowrap",
                      marginLeft: 12,
                    }}
                  >
                    {errors.length}
                  </div>
                </div>
                {!isGroupCollapsed &&
                  errors.map(({ error, index, errorId }) => {
                    const isExpanded = expandedErrorIds.has(errorId)
                    const errorMessage = error.message ?? "No error message"

                    return (
                      <div
                        key={errorId}
                        style={{
                          borderTop: "1px solid #3a3a3a",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 16px 12px 24px",
                            cursor: "pointer",
                            backgroundColor: "#2a2a2a",
                            transition: "background-color 0.2s ease",
                            touchAction: "manipulation",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#333"
                            setHoveredErrorId(errorId)
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#2a2a2a"
                            setHoveredErrorId(null)
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation()
                            e.currentTarget.style.backgroundColor = "#333"
                            setHoveredErrorId(errorId)
                          }}
                          onTouchEnd={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            e.currentTarget.style.backgroundColor = "#2a2a2a"
                            setHoveredErrorId(null)
                            toggleExpandedError(errorId)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpandedError(errorId)
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              fontSize: isSmallScreen ? "12px" : "13px",
                              color: "#ddd",
                              lineHeight: 1.4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              userSelect: "text",
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {errorMessage}
                          </div>
                          <div
                            style={{
                              color: "#888",
                              fontSize: "16px",
                              transform: isExpanded
                                ? "rotate(0deg)"
                                : "rotate(90deg)",
                              transition: "transform 0.2s ease",
                              flexShrink: 0,
                            }}
                          >
                            ›
                          </div>
                        </div>
                        {isExpanded && (
                          <div
                            data-error-id={index}
                            style={{
                              display: "block",
                              padding: "12px 16px 12px 24px",
                              backgroundColor: "#1a1a1a",
                              borderTop: "1px solid #444",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                fontSize: isSmallScreen ? "11px" : "12px",
                                color: "#ccc",
                                lineHeight: 1.5,
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                                hyphens: "auto",
                                userSelect: "text",
                                paddingRight: 30,
                              }}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {errorMessage}
                            </div>
                            <CopyErrorButton
                              errorId={errorId}
                              errorMessage={errorMessage}
                              copiedErrorId={copiedErrorId}
                              onCopy={(message, id) => {
                                copyToClipboard(message)
                                setCopiedErrorId(id)
                                setTimeout(() => setCopiedErrorId(null), 2000)
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
