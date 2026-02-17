import React from "react";
import {
  Box,
  Container,
  Typography,
  Avatar,
  Stack,
  Card,
  IconButton,
  Button,
  Grid,
  Divider,
  useTheme,
  alpha,
  Chip,
} from "@mui/material";
import {
  SignOut,
  UserCircle,
  UsersThree,
  Wallet,
  PencilSimple,
  Bell,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CaretRight,
  ShieldCheck,
  Moon,
  Sun,
  House,
  X,
  Check,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { API_BASE } from "../api";
import useAuthStore from "../store/auth";
import useThemeStore from "../store/themeStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

const Profile = () => {
  const [legalModal, setLegalModal] = React.useState({ open: false, type: "" });
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser, group: authGroup } = useAuthStore();
  const { mode } = useThemeStore();

  // Queries for fresh data
  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me"),
  });

  const { data: picData } = useQuery({
    queryKey: ["profile-pic"],
    queryFn: () => api.get("/auth/get-profile-picture"),
  });

  const { data: groupData } = useQuery({
    queryKey: ["group-details"],
    queryFn: () => api.get("/group/details"),
  });

  const { data: pendingData } = useQuery({
    queryKey: ["pending-requests"],
    queryFn: () => api.get("/group/pending-requests"),
    enabled: userData?.user?.role === "admin",
  });

  const { data: membersData } = useQuery({
    queryKey: ["members"],
    queryFn: () => api.get("/group/members"),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (requestId) =>
      api.post("/group/approve-request", { request_id: requestId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pending-requests", "members"],
      });
      toast.success("Member admission approved");
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId) =>
      api.post("/group/reject-request", { request_id: requestId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
      toast.info("Member request rejected");
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Failed to reject"),
  });

  const handleRefresh = async () => {
    const refreshPromise = Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["group-details"] }),
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["members"] }),
    ]);

    toast.promise(refreshPromise, {
      loading: "Refreshing profile data...",
      success: "Profile updated",
      error: "Refresh failed",
    });
  };

  const user = userData?.user || authUser;
  const group = groupData?.group || authGroup;

  const profilePicUrl = picData?.profile_picture
    ? `${API_BASE}/../uploads/${picData.profile_picture}`
    : null;
  const isAdmin = user?.role === "admin";

  const InfoRow = ({ icon: Icon, label, value, subtext }) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 2,
        px: 0.5,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "12px",
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} weight="duotone" />
        </Box>
        <Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: "text.secondary" }}
          >
            {label}
          </Typography>
          {subtext && (
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", fontWeight: 600 }}
            >
              {subtext}
            </Typography>
          )}
        </Box>
      </Stack>
      <Typography
        variant="body2"
        sx={{ fontWeight: 800, color: "text.primary", textAlign: "right" }}
      >
        {value || "Not Set"}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 10 }}>
      {/* Elegant Header */}
      <Box
        sx={{
          pt: 8,
          pb: 6,
          px: 3,
          textAlign: "center",
          position: "relative",
          background:
            mode === "light"
              ? "radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 70%)"
              : "radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 70%)",
        }}
      >
        <IconButton
          onClick={handleRefresh}
          sx={{
            position: "absolute",
            top: 24,
            right: 24,
            width: 52,
            height: 52,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.12) },
          }}
        >
          <ArrowsClockwise size={26} weight="bold" />
        </IconButton>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Avatar
            src={profilePicUrl}
            sx={{
              width: 90,
              height: 90,
              mx: "auto",
              mb: 2.5,
              boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
              bgcolor: "primary.main",
              fontWeight: 900,
              fontSize: "2.4rem",
              border: `4px solid ${theme.palette.background.paper}`,
            }}
          >
            {user?.name?.charAt(0)}
          </Avatar>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, letterSpacing: "-1.2px", mb: 0.5 }}
          >
            {user?.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 600, opacity: 0.7 }}
          >
            {user?.email}
          </Typography>
        </motion.div>
      </Box>

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Integrated Info Block */}
          <Card
            sx={{
              p: 2.5,
              borderRadius: "28px",
              mb: 4,
              boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
              border: `1.5px solid ${alpha(theme.palette.divider, 0.4)}`,
              bgcolor: "background.paper",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "primary.main",
                mb: 2,
                display: "block",
                letterSpacing: "1px",
              }}
            >
              IDENTITY & ACCESS
            </Typography>
            <InfoRow
              icon={UserCircle}
              label="Name"
              value={user?.name}
              subtext="Global Label"
            />
            <Divider sx={{ opacity: 0.4 }} />
            <InfoRow
              icon={ShieldCheck}
              label="Access Tier"
              value={user?.role?.toUpperCase()}
              subtext="Security Role"
            />
            <Divider sx={{ opacity: 0.4 }} />
            <InfoRow
              icon={CheckCircle}
              label="Status"
              value="ACTIVE"
              subtext="System Record"
            />
          </Card>

          {/* Pending Requests (ADMIN ONLY) - Moved here */}
          {isAdmin && pendingData?.requests?.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 800,
                  color: "error.main",
                  ml: 1,
                  mb: 1,
                  display: "block",
                  letterSpacing: "1px",
                }}
              >
                PENDING ADMISSION ({pendingData.requests.length})
              </Typography>
              {pendingData.requests.map((req) => (
                <Card
                  key={req.id}
                  sx={{
                    p: 2,
                    borderRadius: "24px",
                    mb: 2,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    bgcolor: alpha(theme.palette.error.main, 0.02),
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
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: "error.main",
                          fontWeight: 800,
                        }}
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
                    <Stack direction="row" spacing={1.5}>
                      <IconButton
                        size="large"
                        onClick={() => rejectMutation.mutate(req.id)}
                        sx={{
                          width: 48,
                          height: 48,
                          color: "error.main",
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          "&:hover": {
                            bgcolor: alpha(theme.palette.error.main, 0.2),
                          },
                        }}
                      >
                        <X size={24} weight="bold" />
                      </IconButton>
                      <IconButton
                        size="large"
                        onClick={() => approveMutation.mutate(req.id)}
                        sx={{
                          width: 48,
                          height: 48,
                          color: "success.main",
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          "&:hover": {
                            bgcolor: alpha(theme.palette.success.main, 0.2),
                          },
                        }}
                      >
                        <Check size={24} weight="bold" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Box>
          )}

          <Card
            sx={{
              p: 2.5,
              borderRadius: "28px",
              mb: 4,
              boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
              border: `1.5px solid ${alpha(theme.palette.divider, 0.4)}`,
              bgcolor: "background.paper",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "secondary.main",
                mb: 2,
                display: "block",
                letterSpacing: "1px",
              }}
            >
              CORE CLUSTER{" "}
              {isAdmin && (
                <Chip
                  label="ADMIN"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: "0.6rem",
                    fontWeight: 900,
                    ml: 1,
                    bgcolor: "secondary.main",
                    color: "white",
                  }}
                />
              )}
            </Typography>
            <InfoRow
              icon={House}
              label="Space"
              value={group?.name}
              subtext="Identifier"
            />
            <Divider sx={{ opacity: 0.4 }} />
            <InfoRow
              icon={UserCircle}
              label="Internal Node"
              value={`#GRP-${group?.id || user?.group_id}`}
              subtext="Physical Link"
            />
            <Divider sx={{ opacity: 0.4 }} />
            <InfoRow
              icon={UsersThree}
              label="Capacity"
              value={`${membersData?.members?.length || 0} Members`}
              subtext="Active Sync"
            />
            <Divider sx={{ opacity: 0.4 }} />
            <InfoRow
              icon={CheckCircle}
              label="Established"
              value={
                group?.created_at
                  ? new Date(group.created_at).toLocaleDateString()
                  : "N/A"
              }
              subtext="Cluster Init"
            />
            {isAdmin && (
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={() => {
                  const promise = api.post("/schedule/generate-plan");
                  toast.promise(promise, {
                    loading: "Syncing cluster roster...",
                    success: "Weekly Roster Synchronized",
                    error: "Failed to sync roster",
                  });
                }}
                sx={{
                  mt: 2.5,
                  py: 2,
                  borderRadius: "16px",
                  fontWeight: 800,
                  textTransform: "none",
                  borderStyle: "dashed",
                  borderWidth: "2px",
                  fontSize: "0.95rem",
                  "&:hover": { borderWidth: "2px" },
                }}
              >
                Re-sync Weekly Roster
              </Button>
            )}
          </Card>

          {/* Logout */}
          <Box sx={{ mt: 2, mb: 4 }}>
            <Button
              fullWidth
              onClick={() => {
                useAuthStore.getState().logout();
                navigate("/login");
              }}
              startIcon={<SignOut size={20} weight="bold" />}
              sx={{
                py: 2,
                borderRadius: "20px",
                fontWeight: 800,
                fontSize: "0.95rem",
                textTransform: "none",
                color: "error.main",
                bgcolor: alpha(theme.palette.error.main, 0.06),
                border: `1.5px solid ${alpha(theme.palette.error.main, 0.15)}`,
                "&:hover": {
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                },
                "&:active": { transform: "scale(0.98)" },
                transition: "all 0.15s ease",
              }}
            >
              Sign Out
            </Button>
          </Box>

          {/* Minimal Footer Policy Links */}
          <Stack spacing={2} sx={{ mb: 6, textAlign: "center", opacity: 0.8 }}>
            <Stack direction="row" spacing={3} justifyContent="center">
              <Typography
                variant="caption"
                component="button"
                onClick={() =>
                  setLegalModal({ open: true, type: "Terms of Service" })
                }
                sx={{
                  fontWeight: 700,
                  color: "text.secondary",
                  textDecoration: "none",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  "&:hover": { color: "primary.main" },
                }}
              >
                Terms of Service
              </Typography>
              <Typography
                variant="caption"
                component="button"
                onClick={() =>
                  setLegalModal({ open: true, type: "Privacy Policy" })
                }
                sx={{
                  fontWeight: 700,
                  color: "text.secondary",
                  textDecoration: "none",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  "&:hover": { color: "primary.main" },
                }}
              >
                Privacy Policy
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: "text.disabled",
                letterSpacing: "0.5px",
              }}
            >
              OurSpaceOS • All Rights Reserved
            </Typography>
          </Stack>
        </motion.div>
      </Container>

      {/* Legal Modal */}
      <Dialog
        open={legalModal.open}
        onClose={() => setLegalModal({ open: false, type: "" })}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: "28px", p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, px: 3, pt: 3 }}>
          {legalModal.type}
        </DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8 }}
          >
            {legalModal.type === "Terms of Service" ? (
              <>
                1. <strong>Introduction</strong>: Welcome to OurSpaceOS. By
                using our application, you agree to these terms.
                <br />
                <br />
                2. <strong>Usage</strong>: OurSpaceOS is designed for personal
                use to manage shared household chores and finances. Any
                commercial exploitation or unauthorized use is prohibited.
                <br />
                <br />
                3. <strong>Data Privacy</strong>: We respect your data.
                Information shared within your "Space" is only accessible to
                members admitted by the Administrator.
                <br />
                <br />
                4. <strong>Responsibility</strong>: Users are responsible for
                their accounts and the accuracy of the financial records they
                record.
                <br />
                <br />
                5. <strong>Modifications</strong>: OurSpaceOS reserves the right
                to modify these terms at any time.
              </>
            ) : (
              <>
                1. <strong>Data Collection</strong>: We collect only essential
                information required for functionality, such as your email,
                name, and group association.
                <br />
                <br />
                2. <strong>Purpose</strong>: Data is used to synchronize tasks,
                calculate shared bills, and maintain your Space's history.
                <br />
                <br />
                3. <strong>Third Parties</strong>: We do not sell or share your
                personal data with third-party advertisers.
                <br />
                <br />
                4. <strong>Security</strong>: We implement industry-standard
                security measures to protect your information within OurSpaceOS.
                <br />
                <br />
                5. <strong>Control</strong>: You can request account deletion at
                any time by contacting your Space Administrator or OurSpaceOS
                support.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setLegalModal({ open: false, type: "" })}
            sx={{ borderRadius: "16px", py: 1.5, fontWeight: 800 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
