import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  IconButton,
  Avatar,
  Button,
  Chip,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
  Badge,
} from "@mui/material";
import {
  CaretLeft,
  Bell,
  Check,
  Trash,
  User,
  UsersThree,
  Wallet,
  CalendarBlank,
  Checks,
  Dot,
  X,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { API_BASE } from "../api";
import useAuthStore from "../store/auth";
import useThemeStore from "../store/themeStore";
import useSync from "../hooks/useSync";
import { motion, AnimatePresence } from "framer-motion";
import toast from "../utils/toast";

const Notifications = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mode } = useThemeStore();
  const { refresh: refreshSync } = useSync();

  // Query for notifications
  const {
    data: notifData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((res) => res || {}),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  // Mutations
  const readMutation = useMutation({
    mutationFn: (id) => api.post("/notifications/read", { id }),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.post("/notifications/read"),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast.success("All marked as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.post("/notifications/delete", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast.success("Notification removed");
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.post("/notifications/clear-all"),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast.success("All cleared");
    },
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case "financial":
        return <Wallet size={20} weight="bold" color="#10B981" />;
      case "task":
        return <CalendarBlank size={20} weight="bold" color="#6366F1" />;
      case "group":
        return <UsersThree size={20} weight="bold" color="#F59E0B" />;
      default:
        return <Bell size={20} weight="bold" color="#8B5CF6" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case "financial":
        return alpha("#10B981", 0.1);
      case "task":
        return alpha("#6366F1", 0.1);
      case "group":
        return alpha("#F59E0B", 0.1);
      default:
        return alpha("#8B5CF6", 0.1);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 12 }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          pt: 4,
          pb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              bgcolor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <CaretLeft size={20} weight="bold" />
          </IconButton>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, letterSpacing: "-1.5px" }}
            >
              Activity
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 700 }}
            >
              {unreadCount} NEW UPDATES
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            onClick={() =>
              refreshSync().then(() => toast.success("Checked for updates"))
            }
            sx={{
              bgcolor:
                mode === "light"
                  ? alpha(theme.palette.primary.main, 0.05)
                  : alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.15) },
            }}
          >
            <ArrowsClockwise size={22} weight="bold" />
          </IconButton>
          {notifications.length > 0 && (
            <IconButton onClick={() => clearAllMutation.mutate()} color="error">
              <Trash size={22} weight="bold" />
            </IconButton>
          )}
        </Stack>
        <style>
          {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    `}
        </style>
      </Box>

      <Container maxWidth="sm">
        <Stack spacing={2} sx={{ mt: 2 }}>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Checks size={20} weight="bold" />}
              onClick={() => readAllMutation.mutate()}
              sx={{
                borderRadius: "16px",
                py: 1,
                fontWeight: 800,
                textTransform: "none",
                borderStyle: "dashed",
              }}
            >
              Mark all as read
            </Button>
          )}

          <AnimatePresence>
            {notifications.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 10, opacity: 0.5 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: alpha(theme.palette.divider, 0.4),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <Bell size={40} weight="duotone" />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  All Quiet Here
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  No new notifications for now.
                </Typography>
              </Box>
            ) : (
              notifications.map((notif, index) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    onClick={() =>
                      !notif.is_read && readMutation.mutate(notif.id)
                    }
                    sx={{
                      p: 2,
                      borderRadius: "24px",
                      boxShadow: notif.is_read
                        ? "none"
                        : "0 8px 30px rgba(0,0,0,0.04)",
                      border: `1.5px solid ${notif.is_read ? alpha(theme.palette.divider, 0.4) : alpha(theme.palette.primary.main, 0.2)}`,
                      bgcolor: notif.is_read
                        ? "transparent"
                        : "background.paper",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      overflow: "visible",
                    }}
                  >
                    {!notif.is_read && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 12,
                          left: -6,
                          width: 12,
                          height: 12,
                          bgcolor: "primary.main",
                          borderRadius: "50%",
                          border: "2px solid white",
                          zIndex: 2,
                        }}
                      />
                    )}

                    <Stack direction="row" spacing={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "14px",
                          bgcolor: getBgColor(notif.type),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {getIcon(notif.type)}
                      </Box>

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 900,
                            mb: 0.2,
                            color: notif.is_read
                              ? "text.secondary"
                              : "text.primary",
                          }}
                        >
                          {notif.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            display: "block",
                            mb: 1,
                            lineHeight: 1.4,
                          }}
                        >
                          {notif.message}
                        </Typography>

                        <Stack direction="row" alignItems="center" spacing={1}>
                          {notif.sender_name && (
                            <Chip
                              avatar={
                                <Avatar
                                  src={
                                    notif.sender_avatar
                                      ? `${API_BASE}/../uploads/${notif.sender_avatar}`
                                      : null
                                  }
                                />
                              }
                              label={notif.sender_name}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                bgcolor: alpha(
                                  theme.palette.primary.main,
                                  0.05,
                                ),
                              }}
                            />
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.disabled",
                              fontWeight: 700,
                              fontSize: "0.65rem",
                            }}
                          >
                            {new Date(notif.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Typography>
                        </Stack>
                      </Box>

                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notif.id);
                        }}
                        sx={{ alignSelf: "flex-start", color: "text.disabled" }}
                      >
                        <X size={16} weight="bold" />
                      </IconButton>
                    </Stack>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </Stack>
      </Container>
    </Box>
  );
};

export default Notifications;
