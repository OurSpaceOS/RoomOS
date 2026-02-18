import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  Switch,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  useTheme,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import {
  CaretLeft,
  Plus,
  Repeat,
  House,
  Car,
  Broom,
  Lightning,
  WifiHigh,
  FilmSlate,
  Barbell,
  DotsThreeOutline,
  Trash,
  PencilSimple,
  X,
  CurrencyInr,
  CalendarBlank,
  ArrowsClockwise,
  Tag,
  TextAlignLeft,
  Warning,
  Info,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { alpha } from "@mui/material/styles";
import toast from "../utils/toast";
import api from "../api";
import useSync from "../hooks/useSync";

// Category icons mapping
const CATEGORY_MAP = {
  rent: { label: "Rent", icon: House, color: "#6366f1" },
  maid: { label: "Maid", icon: Broom, color: "#ec4899" },
  travel: { label: "Travel", icon: Car, color: "#f59e0b" },
  electricity: { label: "Electricity", icon: Lightning, color: "#eab308" },
  wifi: { label: "Internet", icon: WifiHigh, color: "#3b82f6" },
  streaming: { label: "Subscriptions", icon: FilmSlate, color: "#ef4444" },
  gym: { label: "Gym/Fitness", icon: Barbell, color: "#10b981" },
  other: { label: "Other", icon: DotsThreeOutline, color: "#64748b" },
};

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AutoDebits = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mode = theme.palette.mode;
  const { refresh: refreshSync } = useSync();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebit, setEditingDebit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    recurrence: "monthly",
    deduct_day: "1",
    category: "other",
    description: "",
  });

  // Fetch auto-debits
  const { data, isLoading } = useQuery({
    queryKey: ["autodebits"],
    queryFn: () => api.get("/autodebits/list"),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/autodebits/create", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["autodebits"]);
      toast.success("Auto-debit created!");
      closeModal();
    },
    onError: (err) => toast.error(err.message || "Failed to create"),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => api.post("/autodebits/update", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["autodebits"]);
      toast.success("Auto-debit updated!");
      closeModal();
    },
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: (id) => api.post("/autodebits/toggle", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["autodebits"]);
    },
    onError: (err) => toast.error(err.message || "Failed to toggle"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.post("/autodebits/delete", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["autodebits"]);
      toast.success("Auto-debit deleted!");
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDebit(null);
    setForm({
      name: "",
      amount: "",
      recurrence: "monthly",
      deduct_day: "1",
      category: "other",
      description: "",
    });
  };

  const openEdit = (debit) => {
    setEditingDebit(debit);
    setForm({
      name: debit.name,
      amount: debit.amount,
      recurrence: debit.recurrence,
      deduct_day: String(debit.deduct_day),
      category: debit.category || "other",
      description: debit.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.amount) {
      toast.error("Name and amount are required");
      return;
    }
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      deduct_day: parseInt(form.deduct_day),
    };

    if (editingDebit) {
      updateMutation.mutate({ ...payload, id: editingDebit.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getRecurrenceLabel = (debit) => {
    if (debit.recurrence === "daily") return "Every day";
    if (debit.recurrence === "weekly")
      return `Every ${DAY_NAMES[debit.deduct_day] || "week"}`;
    return `${debit.deduct_day}${getOrdinal(debit.deduct_day)} of month`;
  };

  const getOrdinal = (n) => {
    const num = parseInt(n);
    if (num > 3 && num < 21) return "th";
    switch (num % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const debits = data?.debits || [];
  const activeDebits = debits.filter((d) => d.is_active);
  const inactiveDebits = debits.filter((d) => !d.is_active);
  const isMutating = createMutation.isPending || updateMutation.isPending;

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
              Auto-Debits
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 600 }}
            >
              Recurring payments & bills
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={() =>
              refreshSync().then(() => toast.success("Auto-debits updated"))
            }
            sx={{
              bgcolor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              width: 44,
              height: 44,
            }}
          >
            <ArrowsClockwise
              size={20}
              weight="bold"
              color={theme.palette.primary.main}
            />
          </IconButton>
          <IconButton
            onClick={() => setIsModalOpen(true)}
            sx={{
              bgcolor: "primary.main",
              color: mode === "light" ? "white" : "#041e49",
              width: 44,
              height: 44,
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
              "&:hover": {
                bgcolor: "primary.dark",
                transform: "scale(1.05)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <Plus size={22} weight="bold" />
          </IconButton>
        </Stack>
      </Box>

      <Container maxWidth="sm">
        {/* Scheduled Execution Notice */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: "20px",
              bgcolor:
                mode === "light"
                  ? alpha(theme.palette.info.main, 0.08)
                  : alpha(theme.palette.info.main, 0.12),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                bgcolor: "info.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Info size={20} weight="bold" />
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: mode === "light" ? "info.dark" : "info.light",
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              Note: Scheduled auto-debits will be processed automatically the
              next time the app is opened on or after the due date.
            </Typography>
          </Box>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card
            sx={{
              p: 3,
              borderRadius: "28px",
              mb: 3,
              background:
                mode === "light"
                  ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
                  : "linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)",
              color: "#fff",
              border: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background pattern */}
            <Box
              sx={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.04)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -30,
                left: -10,
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.03)",
              }}
            />

            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 2 }}
              >
                <Repeat size={18} weight="bold" style={{ opacity: 0.7 }} />
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 700,
                    opacity: 0.7,
                    letterSpacing: "1.5px",
                  }}
                >
                  Monthly Commitment
                </Typography>
              </Stack>

              {isLoading ? (
                <Skeleton
                  variant="text"
                  width={180}
                  height={60}
                  sx={{ bgcolor: "rgba(255,255,255,0.1)" }}
                />
              ) : (
                <>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 800,
                      fontSize: "2.8rem",
                      letterSpacing: "-2px",
                      mb: 0.5,
                    }}
                  >
                    ₹{Math.round(data?.monthly_total || 0).toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.6, fontWeight: 600 }}
                  >
                    {data?.active_count || 0} active auto-debit
                    {(data?.active_count || 0) !== 1 ? "s" : ""}
                  </Typography>
                </>
              )}
            </Box>
          </Card>
        </motion.div>

        {/* Active Debits */}
        {isLoading ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={80}
                sx={{ borderRadius: "20px" }}
              />
            ))}
          </Stack>
        ) : debits.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card
              sx={{
                p: 5,
                borderRadius: "28px",
                textAlign: "center",
                border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
                bgcolor: "transparent",
              }}
            >
              <Repeat
                size={48}
                weight="duotone"
                style={{
                  color: theme.palette.text.disabled,
                  marginBottom: 12,
                }}
              />
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, mb: 1, color: "text.secondary" }}
              >
                No Auto-Debits Yet
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.disabled", fontWeight: 600, mb: 3 }}
              >
                Add your recurring expenses like rent, maid, subscriptions
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus weight="bold" />}
                onClick={() => setIsModalOpen(true)}
                sx={{
                  borderRadius: "16px",
                  px: 4,
                  py: 1.5,
                  fontWeight: 800,
                  textTransform: "none",
                }}
              >
                Add First Debit
              </Button>
            </Card>
          </motion.div>
        ) : (
          <>
            {activeDebits.length > 0 && (
              <>
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    letterSpacing: "1px",
                    mb: 1.5,
                    display: "block",
                    px: 1,
                  }}
                >
                  ACTIVE ({activeDebits.length})
                </Typography>
                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  <AnimatePresence>
                    {activeDebits.map((debit, idx) => {
                      const cat =
                        CATEGORY_MAP[debit.category] || CATEGORY_MAP.other;
                      const CatIcon = cat.icon;
                      return (
                        <motion.div
                          key={debit.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <Card
                            sx={{
                              p: 2,
                              borderRadius: "20px",
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              bgcolor: "background.paper",
                              "&:hover": { bgcolor: "action.hover" },
                              transition: "all 0.2s",
                            }}
                          >
                            {/* Category Icon */}
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: "14px",
                                bgcolor: alpha(cat.color, 0.1),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <CatIcon
                                size={24}
                                weight="duotone"
                                color={cat.color}
                              />
                            </Box>

                            {/* Info */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 800,
                                  fontSize: "0.95rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {debit.name}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Chip
                                  label={debit.recurrence}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.6rem",
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    bgcolor: alpha(cat.color, 0.08),
                                    color: cat.color,
                                    letterSpacing: "0.5px",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.secondary",
                                    fontWeight: 600,
                                    fontSize: "0.65rem",
                                  }}
                                >
                                  {getRecurrenceLabel(debit)}
                                </Typography>
                              </Stack>
                            </Box>

                            {/* Amount & Actions */}
                            <Stack
                              alignItems="flex-end"
                              spacing={0.5}
                              sx={{ flexShrink: 0 }}
                            >
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 900,
                                  color: "text.primary",
                                  fontSize: "1rem",
                                }}
                              >
                                ₹
                                {Math.round(
                                  parseFloat(debit.amount),
                                ).toLocaleString()}
                              </Typography>
                              <Stack direction="row" spacing={0.5}>
                                <IconButton
                                  size="small"
                                  onClick={() => openEdit(debit)}
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    color: "text.secondary",
                                  }}
                                >
                                  <PencilSimple size={14} weight="bold" />
                                </IconButton>
                                <Switch
                                  size="small"
                                  checked={!!debit.is_active}
                                  onChange={() =>
                                    toggleMutation.mutate(debit.id)
                                  }
                                  color="primary"
                                  sx={{ mr: -1 }}
                                />
                              </Stack>
                            </Stack>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </Stack>
              </>
            )}

            {inactiveDebits.length > 0 && (
              <>
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 800,
                    color: "text.disabled",
                    letterSpacing: "1px",
                    mb: 1.5,
                    display: "block",
                    px: 1,
                  }}
                >
                  PAUSED ({inactiveDebits.length})
                </Typography>
                <Stack spacing={1.5}>
                  <AnimatePresence>
                    {inactiveDebits.map((debit, idx) => {
                      const cat =
                        CATEGORY_MAP[debit.category] || CATEGORY_MAP.other;
                      const CatIcon = cat.icon;
                      return (
                        <motion.div
                          key={debit.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <Card
                            sx={{
                              p: 2,
                              borderRadius: "20px",
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              bgcolor: "background.paper",
                              opacity: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: "14px",
                                bgcolor: alpha(cat.color, 0.06),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <CatIcon
                                size={24}
                                weight="duotone"
                                color={theme.palette.text.disabled}
                              />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 700,
                                  color: "text.disabled",
                                  textDecoration: "line-through",
                                }}
                              >
                                {debit.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "text.disabled",
                                  fontWeight: 600,
                                }}
                              >
                                ₹
                                {Math.round(
                                  parseFloat(debit.amount),
                                ).toLocaleString()}{" "}
                                • Paused
                              </Typography>
                            </Box>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                            >
                              <IconButton
                                size="small"
                                onClick={() => setDeleteConfirm(debit)}
                                sx={{
                                  color: "error.main",
                                  width: 28,
                                  height: 28,
                                }}
                              >
                                <Trash size={14} weight="bold" />
                              </IconButton>
                              <Switch
                                size="small"
                                checked={false}
                                onChange={() => toggleMutation.mutate(debit.id)}
                                color="primary"
                              />
                            </Stack>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </Stack>
              </>
            )}
          </>
        )}
      </Container>

      {/* Create / Edit Modal */}
      <Dialog
        open={isModalOpen}
        onClose={closeModal}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "32px",
            p: 1,
            maxWidth: "420px",
            backgroundImage: "none",
            bgcolor:
              mode === "light"
                ? "rgba(255,255,255,0.95)"
                : "rgba(23,23,23,0.95)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Repeat
                weight="duotone"
                size={24}
                color={theme.palette.primary.main}
              />
            </Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}
            >
              {editingDebit ? "Edit Auto-Debit" : "New Auto-Debit"}
            </Typography>
          </Stack>
          <IconButton onClick={closeModal} sx={{ color: "text.disabled" }}>
            <X weight="bold" size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Name */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  ml: 1,
                  mb: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Tag size={12} weight="bold" /> NAME
              </Typography>
              <TextField
                fullWidth
                variant="filled"
                placeholder="e.g. Monthly Rent"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    borderRadius: "16px",
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.action.active, 0.04),
                  },
                }}
              />
            </Box>

            {/* Amount */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  ml: 1,
                  mb: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <CurrencyInr size={12} weight="bold" /> AMOUNT
              </Typography>
              <TextField
                fullWidth
                variant="filled"
                placeholder="0"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <Typography
                      sx={{ mr: 1, fontWeight: 800, color: "text.secondary" }}
                    >
                      ₹
                    </Typography>
                  ),
                  sx: {
                    borderRadius: "16px",
                    fontWeight: 800,
                    fontSize: "1.2rem",
                    bgcolor: alpha(theme.palette.action.active, 0.04),
                  },
                }}
              />
            </Box>

            {/* Category */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  ml: 1,
                  mb: 0.5,
                  display: "block",
                }}
              >
                CATEGORY
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(CATEGORY_MAP).map(([key, val]) => {
                  const CatIcon = val.icon;
                  const isSelected = form.category === key;
                  return (
                    <Chip
                      key={key}
                      label={val.label}
                      icon={
                        <CatIcon
                          size={14}
                          weight={isSelected ? "fill" : "regular"}
                        />
                      }
                      onClick={() => setForm({ ...form, category: key })}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        borderRadius: "12px",
                        height: 34,
                        bgcolor: isSelected
                          ? alpha(val.color, 0.12)
                          : "transparent",
                        color: isSelected ? val.color : "text.secondary",
                        border: isSelected
                          ? `1.5px solid ${alpha(val.color, 0.4)}`
                          : `1px solid ${theme.palette.divider}`,
                        "& .MuiChip-icon": {
                          color: isSelected ? val.color : "inherit",
                        },
                        transition: "all 0.2s ease",
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            {/* Recurrence */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  ml: 1,
                  mb: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <ArrowsClockwise size={12} weight="bold" /> RECURRENCE
              </Typography>
              <Stack direction="row" spacing={1}>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={
                      form.recurrence === opt.value ? "contained" : "outlined"
                    }
                    onClick={() =>
                      setForm({
                        ...form,
                        recurrence: opt.value,
                        deduct_day: opt.value === "daily" ? "0" : "1",
                      })
                    }
                    sx={{
                      flex: 1,
                      borderRadius: "14px",
                      fontWeight: 800,
                      py: 1.2,
                      textTransform: "none",
                      fontSize: "0.8rem",
                      boxShadow: "none",
                      ...(form.recurrence !== opt.value && {
                        borderColor: theme.palette.divider,
                        color: "text.secondary",
                      }),
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </Stack>
            </Box>

            {/* Deduction Day */}
            {form.recurrence !== "daily" && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    ml: 1,
                    mb: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <CalendarBlank size={12} weight="bold" />{" "}
                  {form.recurrence === "weekly"
                    ? "DAY OF WEEK"
                    : "DAY OF MONTH"}
                </Typography>
                {form.recurrence === "weekly" ? (
                  <Stack direction="row" spacing={0.5}>
                    {DAY_NAMES.map((day, i) => (
                      <Button
                        key={i}
                        variant={
                          form.deduct_day === String(i)
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() =>
                          setForm({ ...form, deduct_day: String(i) })
                        }
                        sx={{
                          minWidth: 0,
                          flex: 1,
                          borderRadius: "12px",
                          fontWeight: 800,
                          fontSize: "0.65rem",
                          py: 1,
                          boxShadow: "none",
                          ...(form.deduct_day !== String(i) && {
                            borderColor: theme.palette.divider,
                            color: "text.secondary",
                          }),
                        }}
                      >
                        {day}
                      </Button>
                    ))}
                  </Stack>
                ) : (
                  <TextField
                    fullWidth
                    variant="filled"
                    type="number"
                    placeholder="1-31"
                    value={form.deduct_day}
                    onChange={(e) => {
                      let val = parseInt(e.target.value);
                      if (val < 1) val = 1;
                      if (val > 31) val = 31;
                      setForm({ ...form, deduct_day: String(val || "") });
                    }}
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        borderRadius: "16px",
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.action.active, 0.04),
                      },
                    }}
                  />
                )}
              </Box>
            )}

            {/* Description (optional) */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  ml: 1,
                  mb: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <TextAlignLeft size={12} weight="bold" /> NOTE{" "}
                <Box component="span" sx={{ opacity: 0.5 }}>
                  (optional)
                </Box>
              </Typography>
              <TextField
                fullWidth
                variant="filled"
                placeholder="Add a reminder note..."
                multiline
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    borderRadius: "16px",
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.action.active, 0.04),
                  },
                }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1, flexDirection: "column", gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={isMutating || !form.name.trim() || !form.amount}
            sx={{
              borderRadius: "18px",
              py: 1.8,
              fontWeight: 900,
              fontSize: "0.95rem",
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`,
              textTransform: "none",
              "&:hover": {
                boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.35)}`,
                transform: "translateY(-1px)",
              },
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {isMutating ? (
              <CircularProgress size={24} sx={{ color: "white" }} />
            ) : editingDebit ? (
              "Save Changes"
            ) : (
              "Create Auto-Debit"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        PaperProps={{
          sx: {
            borderRadius: "28px",
            p: 1,
            maxWidth: "360px",
            width: "90%",
          },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", pt: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "rgba(239, 68, 68, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <Warning size={32} weight="duotone" color="#ef4444" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Delete Auto-Debit?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 600 }}
          >
            "{deleteConfirm?.name}" will be permanently removed. This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            fullWidth
            onClick={() => setDeleteConfirm(null)}
            sx={{
              borderRadius: "16px",
              fontWeight: 800,
              textTransform: "none",
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={() => deleteMutation.mutate(deleteConfirm.id)}
            disabled={deleteMutation.isPending}
            sx={{
              borderRadius: "16px",
              fontWeight: 800,
              textTransform: "none",
            }}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutoDebits;
