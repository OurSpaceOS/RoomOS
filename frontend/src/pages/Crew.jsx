import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  Avatar,
  IconButton,
  Chip,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
  Button,
  Badge,
} from "@mui/material";
import {
  CaretLeft,
  UsersThree,
  Crown,
  EnvelopeSimple,
  UserPlus,
  Check,
  X,
  ShieldCheck,
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

const Crew = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthStore();
  const { mode } = useThemeStore();
  const { refresh: refreshSync } = useSync();

  // Queries
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["group-members"],
    queryFn: () => api.get("/group/members"),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: groupData } = useQuery({
    queryKey: ["group-details"],
    queryFn: () => api.get("/group/details"),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: requestsData } = useQuery({
    queryKey: ["pending-requests"],
    queryFn: () => api.get("/group/pending-requests"),
    enabled: authUser?.role === "admin",
    staleTime: Infinity,
    refetchOnMount: false,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (requestId) =>
      api.post("/group/approve-request", { request_id: requestId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["pending-requests"]);
      queryClient.invalidateQueries(["group-members"]);
      toast.success("Member approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId) =>
      api.post("/group/reject-request", { request_id: requestId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["pending-requests"]);
      toast.success("Request declined");
    },
  });

  if (membersLoading) {
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

  const members = membersData?.members || [];
  const requests = requestsData?.requests || [];
  const groupName = groupData?.group?.name || "Your Space";
  const isAdmin = authUser?.role === "admin";

  const getProfilePic = (filename) =>
    filename ? `${API_BASE}/../uploads/${filename}` : null;

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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
              The Crew
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              {groupName.toUpperCase()}
            </Typography>
          </Box>
        </div>
        <IconButton
          onClick={() =>
            refreshSync().then(() => toast.success("Crew updated"))
          }
          sx={{
            bgcolor: "background.paper",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <ArrowsClockwise
            size={20}
            weight="bold"
            color={theme.palette.primary.main}
          />
        </IconButton>
      </Box>

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Pending Requests Section (Admin only) */}
          {isAdmin && requests.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 800,
                  color: "primary.main",
                  tracking: "1px",
                  mb: 2,
                  display: "block",
                  px: 1,
                }}
              >
                JOIN REQUESTS ({requests.length})
              </Typography>
              <Stack spacing={2}>
                {requests.map((req) => (
                  <Card
                    key={req.id}
                    sx={{
                      p: 2,
                      borderRadius: "24px",
                      border: `2px solid ${theme.palette.primary.main}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          sx={{ bgcolor: "primary.main", fontWeight: 800 }}
                        >
                          {req.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {req.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", fontWeight: 600 }}
                          >
                            {req.email}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          onClick={() => rejectMutation.mutate(req.id)}
                          sx={{
                            bgcolor: "error.container",
                            color: "error.main",
                          }}
                        >
                          <X size={20} weight="bold" />
                        </IconButton>
                        <IconButton
                          onClick={() => approveMutation.mutate(req.id)}
                          sx={{
                            bgcolor: "success.container",
                            color: "success.main",
                          }}
                        >
                          <Check size={20} weight="bold" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          <Stack spacing={2.5}>
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: "32px",
                    boxShadow:
                      mode === "light"
                        ? "0 10px 40px rgba(0,0,0,0.04)"
                        : "0 10px 40px rgba(0,0,0,0.2)",
                    border: `1.5px solid ${alpha(theme.palette.divider, 0.5)}`,
                    bgcolor: "background.paper",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                  }}
                >
                  {/* Role Backdrop Decoration */}
                  {member.role === "admin" && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                        borderRadius: "50%",
                        filter: "blur(20px)",
                        zIndex: 0,
                      }}
                    />
                  )}

                  <Stack
                    direction="row"
                    spacing={2.5}
                    alignItems="center"
                    sx={{ position: "relative", zIndex: 1 }}
                  >
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      badgeContent={
                        member.role === "admin" ? (
                          <Box
                            sx={{
                              bgcolor: "warning.main",
                              color: "white",
                              borderRadius: "50%",
                              p: 0.6,
                              display: "flex",
                              border: "3px solid white",
                              boxShadow: "0 4px 12px rgba(255, 152, 0, 0.3)",
                            }}
                          >
                            <Crown size={14} weight="fill" />
                          </Box>
                        ) : null
                      }
                    >
                      <Avatar
                        src={getProfilePic(member.profile_picture)}
                        sx={{
                          width: 72,
                          height: 72,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: "primary.main",
                          fontWeight: 900,
                          fontSize: "1.8rem",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                      >
                        {member.name.charAt(0)}
                      </Avatar>
                    </Badge>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 0.8, flexWrap: "wrap", gap: 1 }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 900,
                            fontSize: "1.1rem",
                            letterSpacing: "-0.5px",
                          }}
                        >
                          {member.name}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          {member.id === authUser?.id && (
                            <Chip
                              label="YOU"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.6rem",
                                fontWeight: 900,
                                bgcolor: "primary.main",
                                color: "white",
                                px: 0.5,
                                letterSpacing: "0.5px",
                              }}
                            />
                          )}
                          <Chip
                            label={member.role === "admin" ? "ADMIN" : "CREW"}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 18,
                              fontSize: "0.6rem",
                              fontWeight: 900,
                              borderColor:
                                member.role === "admin"
                                  ? "warning.main"
                                  : "divider",
                              color:
                                member.role === "admin"
                                  ? "warning.main"
                                  : "text.secondary",
                              letterSpacing: "0.5px",
                            }}
                          />
                        </Stack>
                      </Stack>

                      <Stack spacing={0.5}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.8,
                            noWrap: true,
                          }}
                        >
                          <EnvelopeSimple
                            size={14}
                            weight="bold"
                            color={theme.palette.primary.main}
                          />{" "}
                          {member.email}
                        </Typography>
                        {member.created_at && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.disabled",
                              fontWeight: 700,
                              fontSize: "0.65rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Boarded:{" "}
                            {new Date(member.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", year: "numeric" },
                            )}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Card>
              </motion.div>
            ))}
          </Stack>

          {/* Invite Info Card */}
          <Box sx={{ mt: 5, px: 1 }}>
            <Card
              sx={{
                p: 4,
                borderRadius: "32px",
                background:
                  mode === "light"
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`
                    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                border: "2px dashed",
                borderColor: alpha(theme.palette.primary.main, 0.2),
                textAlign: "center",
                boxShadow: "none",
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "18px",
                  bgcolor: "primary.main",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2.5,
                  boxShadow: "0 8px 20px rgba(99, 102, 241, 0.3)",
                }}
              >
                <UserPlus size={28} weight="bold" />
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 900, mb: 1, letterSpacing: "-0.5px" }}
              >
                Grow your Space
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  maxWidth: "80%",
                  mx: "auto",
                  mb: 3,
                }}
              >
                Ask your roommates to join using your Space ID during setup.
              </Typography>

              {groupData?.group?.id && (
                <Box
                  sx={{
                    p: 1.5,
                    pl: 3,
                    pr: 1,
                    bgcolor: "background.paper",
                    borderRadius: "20px",
                    border: "1.5px solid",
                    borderColor: alpha(theme.palette.primary.main, 0.1),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: "4px",
                      color: "primary.main",
                      fontFamily: "monospace",
                    }}
                  >
                    {groupData.group.id}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      borderRadius: "14px",
                      fontWeight: 900,
                      px: 3,
                      boxShadow: "none",
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                      },
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(groupData.group.id);
                      toast.success("Space ID copied!");
                    }}
                  >
                    Copy
                  </Button>
                </Box>
              )}
            </Card>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Crew;
