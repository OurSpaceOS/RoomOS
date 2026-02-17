import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  X,
  DownloadSimple,
  CheckCircle,
  CalendarBlank,
  ShieldCheck,
} from "@phosphor-icons/react";
import api from "../api";

const APP_VERSION = "1.0.0";

const UpdateChecker = () => {
  const theme = useTheme();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Check if user dismissed this version before
        const dismissedVersion = localStorage.getItem(
          "dismissed_update_version",
        );

        const data = await api.get("/updates/check");

        if (data.has_update) {
          // If forced update, always show. Otherwise check if dismissed.
          if (data.force_update || dismissedVersion !== data.latest_version) {
            setUpdateInfo(data);
            setShowModal(true);
          }
        }
      } catch {
        // Silently fail - update check is non-critical
      }
    };

    // Check after a short delay so the app loads first
    const timer = setTimeout(checkForUpdates, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    if (updateInfo) {
      localStorage.setItem(
        "dismissed_update_version",
        updateInfo.latest_version,
      );
    }
    setShowModal(false);
  };

  const handleDownload = () => {
    if (updateInfo?.download_url) {
      window.open(updateInfo.download_url, "_blank");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (!showModal || !updateInfo) return null;

  return (
    <AnimatePresence>
      {showModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={updateInfo.force_update ? undefined : handleDismiss}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99998,
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
            style={{
              position: "fixed",
              bottom: 24,
              left: 16,
              right: 16,
              zIndex: 99999,
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            <Box
              sx={{
                borderRadius: "28px",
                bgcolor: "background.paper",
                overflow: "hidden",
                boxShadow: `0 24px 48px ${alpha("#000", 0.15)}`,
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              {/* Header Gradient */}
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`,
                  px: 3,
                  pt: 3,
                  pb: 4,
                  position: "relative",
                }}
              >
                {/* Close button - only if not forced */}
                {!updateInfo.force_update && (
                  <IconButton
                    onClick={handleDismiss}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      color: "white",
                      bgcolor: alpha("#fff", 0.15),
                      "&:hover": { bgcolor: alpha("#fff", 0.25) },
                      width: 32,
                      height: 32,
                    }}
                  >
                    <X size={16} weight="bold" />
                  </IconButton>
                )}

                {/* Icon + Version */}
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "18px",
                      bgcolor: alpha("#fff", 0.15),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Rocket size={32} weight="duotone" color="white" />
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        color: "white",
                        letterSpacing: "-0.5px",
                        lineHeight: 1.2,
                      }}
                    >
                      {updateInfo.title || "Update Available"}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 0.5 }}
                    >
                      <Chip
                        label={`v${updateInfo.latest_version}`}
                        size="small"
                        sx={{
                          bgcolor: alpha("#fff", 0.2),
                          color: "white",
                          fontWeight: 800,
                          fontSize: "0.7rem",
                          height: 24,
                        }}
                      />
                      {updateInfo.force_update && (
                        <Chip
                          icon={
                            <ShieldCheck
                              size={14}
                              weight="bold"
                              color="white"
                            />
                          }
                          label="Required"
                          size="small"
                          sx={{
                            bgcolor: alpha("#FF6B6B", 0.3),
                            color: "white",
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            height: 24,
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Box>

              {/* Content */}
              <Box sx={{ px: 3, pt: 3, pb: 1 }}>
                {/* Description */}
                {updateInfo.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      lineHeight: 1.6,
                      mb: 2.5,
                    }}
                  >
                    {updateInfo.description}
                  </Typography>
                )}

                {/* Release Notes */}
                {updateInfo.release_notes?.length > 0 && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: "text.disabled",
                        letterSpacing: "0.5px",
                        mb: 1.5,
                        display: "block",
                      }}
                    >
                      What's New
                    </Typography>
                    <Stack spacing={1}>
                      {updateInfo.release_notes.map((note, i) => (
                        <Stack
                          key={i}
                          direction="row"
                          spacing={1.5}
                          alignItems="flex-start"
                        >
                          <CheckCircle
                            size={18}
                            weight="fill"
                            color={theme.palette.success.main}
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.primary",
                              fontWeight: 600,
                              lineHeight: 1.5,
                            }}
                          >
                            {note}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Release Date */}
                {updateInfo.release_date && (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      py: 1.5,
                      borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    }}
                  >
                    <CalendarBlank
                      size={16}
                      weight="bold"
                      color={theme.palette.text.disabled}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: "text.disabled", fontWeight: 700 }}
                    >
                      Released {formatDate(updateInfo.release_date)}
                    </Typography>
                  </Stack>
                )}
              </Box>

              {/* Buttons */}
              <Box sx={{ px: 3, pb: 3, pt: 1 }}>
                <Stack spacing={1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<DownloadSimple size={20} weight="bold" />}
                    onClick={handleDownload}
                    sx={{
                      borderRadius: "16px",
                      fontWeight: 800,
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "0.95rem",
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                      "&:hover": {
                        boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                    }}
                  >
                    Download Update
                  </Button>

                  {!updateInfo.force_update && (
                    <Button
                      fullWidth
                      variant="text"
                      size="large"
                      onClick={handleDismiss}
                      sx={{
                        borderRadius: "16px",
                        fontWeight: 700,
                        py: 1,
                        textTransform: "none",
                        color: "text.secondary",
                        fontSize: "0.85rem",
                        "&:hover": {
                          bgcolor: alpha(theme.palette.divider, 0.05),
                        },
                      }}
                    >
                      Maybe Later
                    </Button>
                  )}
                </Stack>
              </Box>

              {/* Version info footer */}
              <Box
                sx={{
                  px: 3,
                  pb: 2,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    fontWeight: 600,
                    fontSize: "0.65rem",
                  }}
                >
                  Current: v{updateInfo.current_version} → v
                  {updateInfo.latest_version}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UpdateChecker;
