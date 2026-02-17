import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "../utils/toast";
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  IconButton,
  Avatar,
  Grid,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Chip,
  Paper,
  Divider,
  alpha,
  Card,
  InputBase,
  Collapse,
} from "@mui/material";
import {
  Check,
  Plus,
  TrendUp,
  TrendDown,
  ArrowsClockwise,
  Trash,
  X,
  Info,
  Hamburger,
  ShoppingCart,
  Car,
  Lightning,
  House,
  FilmStrip,
  DotsThree,
  Warning,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  CaretRight,
  CaretDown,
  Handshake,
  CalendarBlank,
  ShoppingBag,
  FirstAid,
  Television,
  Gift,
  Wrench,
  Coffee,
  Briefcase,
  Users,
  GraduationCap,
  Bank,
  Coins,
  Wallet as WalletIcon,
  ChartPieSlice,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import useAuthStore from "../store/auth";
import useThemeStore from "../store/themeStore";
import useSync from "../hooks/useSync";

const CATEGORIES = [
  { id: "food", label: "Food", icon: Hamburger, color: "#f59e0b" },
  { id: "coffee", label: "Cafe", icon: Coffee, color: "#d97706" },
  { id: "groceries", label: "Grocery", icon: ShoppingCart, color: "#10b981" },
  { id: "shopping", label: "Shop", icon: ShoppingBag, color: "#ec4899" },
  { id: "transport", label: "Ride", icon: Car, color: "#3b82f6" },
  { id: "utilities", label: "Bills", icon: Lightning, color: "#8b5cf6" },
  { id: "rent", label: "Rent", icon: House, color: "#6366f1" },
  { id: "fun", label: "Fun", icon: FilmStrip, color: "#f43f5e" },
  { id: "health", label: "Health", icon: FirstAid, color: "#ef4444" },
  { id: "subs", label: "Subs", icon: Television, color: "#06b6d4" },
  { id: "gift", label: "Gift", icon: Gift, color: "#8b5cf6" },
  { id: "fix", label: "Fix", icon: Wrench, color: "#64748b" },
  { id: "settle", label: "Settle", icon: Handshake, color: "#10b981" },
  { id: "other", label: "Other", icon: DotsThree, color: "#94a3b8" },
];

const INCOME_SOURCES = [
  { id: "home", label: "Home", icon: House, color: "#10b981" },
  { id: "job", label: "Job", icon: Briefcase, color: "#3b82f6" },
  { id: "friends", label: "Friends", icon: Users, color: "#f59e0b" },
  {
    id: "internship",
    label: "Internship",
    icon: GraduationCap,
    color: "#8b5cf6",
  },
  { id: "borrow", label: "Borrow", icon: Bank, color: "#ef4444" },
  { id: "other", label: "Other", icon: Coins, color: "#64748b" },
];

const Wallet = () => {
  const theme = useTheme();
  const { mode } = useThemeStore();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { refresh: refreshSync } = useSync();

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(15);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false);
  const [selectedRoommate, setSelectedRoommate] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);

  // Income state
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeSource, setIncomeSource] = useState("job");
  const [incomeDesc, setIncomeDesc] = useState("");

  // Form state
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [splitBetween, setSplitBetween] = useState([]);
  const [paidBy, setPaidBy] = useState(user?.id);
  const isAdmin = user?.role === "admin";
  const isSettlement = useMemo(() => {
    if (splitBetween.length !== 1) return false;
    return parseInt(splitBetween[0]) !== parseInt(paidBy);
  }, [splitBetween, paidBy]);

  // Logic for current month
  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long" });

  // Queries
  const { data: transData, isLoading: transLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get("/transactions/list").then((res) => res || {}),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => api.get("/group/members").then((res) => res || {}),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: budgetStats } = useQuery({
    queryKey: ["budget-stats"],
    queryFn: () => api.get("/budget/stats"),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  // Process any due auto-debits on wallet load
  useQuery({
    queryKey: ["autodebits-process"],
    queryFn: () => api.post("/autodebits/process"),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (payload) => api.post("/transactions/add", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions"]);
      setIsAddModalOpen(false);
      resetForm();
      toast.success("Expense recorded successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to add expense");
    },
  });

  const addIncomeMutation = useMutation({
    mutationFn: (payload) => api.post("/budget/add-income", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["budget-stats"]);
      setIsIncomeModalOpen(false);
      setIncomeAmount("");
      setIncomeDesc("");
      toast.success("Income added successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to add income");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      api.post("/transactions/delete", { transaction_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions"]);
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
      toast.success("Transaction removed");
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: () => api.post("/transactions/recalculate"),
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions"]);
      toast.success("Balances re-synchronized");
    },
  });

  // Calculations based on legacy logic
  const { stats, filteredTransactions } = useMemo(() => {
    if (!transData)
      return {
        stats: { debt: 0, surplus: 0, monthlyTotal: 0 },
        filteredTransactions: [],
      };

    let debt = 0,
      surplus = 0;
    (transData.balances || []).forEach((b) => {
      const val = parseFloat(b.balance);
      if (val > 0) surplus += val;
      else if (val < 0) debt += Math.abs(val);
    });

    const now = new Date();
    const allTx = transData.transactions || [];
    const filtered = allTx.filter((t) => {
      const payerId = parseInt(t.user_id);
      const myId = parseInt(user.id);
      let split = [];
      try {
        split =
          typeof t.split_between === "string"
            ? JSON.parse(t.split_between)
            : t.split_between || [];
      } catch (e) {}
      return payerId === myId || split.map((id) => parseInt(id)).includes(myId);
    });

    const monthlyTotal = filtered
      .filter((t) => {
        const d = new Date(t.created_at);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, t) => {
        let split = [];
        try {
          split =
            typeof t.split_between === "string"
              ? JSON.parse(t.split_between)
              : t.split_between || [];
        } catch (e) {}
        const splitIds = split.map((id) => parseInt(id));
        const myId = parseInt(user.id);
        if (splitIds.includes(myId)) {
          return sum + parseFloat(t.amount || 0) / splitIds.length;
        }
        return sum;
      }, 0);

    const totalIncome = parseFloat(budgetStats?.total_income || 0);
    const remainingBalance = totalIncome - monthlyTotal;

    return {
      stats: {
        debt,
        surplus,
        monthlyTotal,
        totalIncome,
        remainingBalance,
      },
      filteredTransactions: filtered,
    };
  }, [transData, user.id, budgetStats]);

  const resetForm = () => {
    setDesc("");
    setAmount("");
    setCategory("other");
    setPaidBy(user?.id);
    if (membersData?.members)
      setSplitBetween(membersData.members.map((m) => m.id));
  };

  // Auto-open modal if navigated from Dashboard
  useEffect(() => {
    if (location.state?.openAddModal) {
      resetForm();
      setIsAddModalOpen(true);
      // Clear location state to prevent modal from re-opening on manual refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, membersData]);

  if (transLoading || membersLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress
          thickness={4}
          size={48}
          sx={{ color: "primary.main" }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        pb: 12,
        transition: "background-color 0.3s ease",
      }}
    >
      {/* Header Area */}
      <Box
        sx={{
          px: 3,
          pt: 6,
          pb: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: "text.primary",
              letterSpacing: "-1.5px",
              mb: 0.5,
            }}
          >
            Wallet
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 600, opacity: 0.7 }}
          >
            Manage shared expenses & settlements
          </Typography>
        </Box>
        <IconButton
          onClick={() => navigate("/analytics")}
          sx={{
            bgcolor:
              mode === "light"
                ? alpha(theme.palette.primary.main, 0.05)
                : alpha(theme.palette.primary.main, 0.1),
            p: 1.5,
            borderRadius: "16px",
            transition: "all 0.2s",
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              transform: "translateY(-2px)",
            },
          }}
        >
          <ChartPieSlice
            size={24}
            weight="duotone"
            color={theme.palette.primary.main}
          />
        </IconButton>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 2 }}>
        {/* 1. Fluid Stats Surface (Fixed Alignment & Overlap) */}
        <Card
          sx={{
            p: 2,
            borderRadius: "24px",
            mb: 2,
            bgcolor: mode === "light" ? "background.paper" : "background.paper",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            border: "none",
            background:
              mode === "light"
                ? "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)"
                : "background.paper",
          }}
        >
          <Grid container alignItems="center">
            {/* Left Side: You Owe (Pushed Left) */}
            <Grid
              size={5.8}
              sx={{ display: "flex", justifyContent: "flex-start", px: 1 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    p: 1,
                    borderRadius: "12px",
                    color: "error.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendDown size={20} weight="bold" />
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: "text.secondary",
                      fontSize: "0.65rem",
                      letterSpacing: "0.5px",
                      display: "block",
                    }}
                  >
                    YOU OWE
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, lineHeight: 1.1 }}
                  >
                    ₹{Math.round(stats.debt)}
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            {/* Center Spacer/Divider Area */}
            <Grid size={0.4} sx={{ display: "flex", justifyContent: "center" }}>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ borderRightWidth: 1.5, height: 28, opacity: 0.1 }}
              />
            </Grid>

            {/* Right Side: Owed to You (Pushed Right) */}
            <Grid
              size={5.8}
              sx={{ display: "flex", justifyContent: "flex-end", px: 1 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    p: 1,
                    borderRadius: "12px",
                    color: "success.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendUp size={20} weight="bold" />
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: "text.secondary",
                      fontSize: "0.65rem",
                      letterSpacing: "0.5px",
                      display: "block",
                    }}
                  >
                    OWED TO YOU
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, lineHeight: 1.1 }}
                  >
                    ₹{Math.round(stats.surplus)}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Card>

        {/* 2. Income & Spending Card — Material You / M3 */}
        {(() => {
          const pct =
            stats.totalIncome > 0
              ? Math.min((stats.monthlyTotal / stats.totalIncome) * 100, 100)
              : 0;
          const getTier = (p) => {
            if (p >= 90)
              return {
                color: "#b71c1c",
                label: "💀 Over Limit",
                chipBg: alpha("#b71c1c", 0.08),
                msg: "You've maxed out this month",
              };
            if (p >= 60)
              return {
                color: "#d32f2f",
                label: "⚠️ High Spend",
                chipBg: alpha("#d32f2f", 0.08),
                msg: "Spending accelerating fast",
              };
            if (p >= 30)
              return {
                color: "#ef6c00",
                label: "😬 Moderate",
                chipBg: alpha("#ef6c00", 0.08),
                msg: "Keep an eye on your spending",
              };
            return {
              color: "#2e7d32",
              label: "✅ Healthy",
              chipBg: alpha("#2e7d32", 0.08),
              msg: `₹${Math.round(stats.remainingBalance).toLocaleString()} still available`,
            };
          };
          const tier = getTier(pct);

          return (
            <Card
              elevation={0}
              sx={{
                p: 0,
                borderRadius: "28px",
                mb: 3,
                bgcolor:
                  mode === "light" ? "primary.container" : "background.paper",
                color:
                  mode === "light" ? "primary.onContainer" : "text.primary",
                overflow: "hidden",
                border:
                  mode === "light"
                    ? "1px solid rgba(0,0,0,0.04)"
                    : `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                boxShadow:
                  mode === "light" ? "none" : "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              {/* Top section — Income headline */}
              <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Typography
                    variant="overline"
                    sx={{
                      fontWeight: 700,
                      letterSpacing: "1.2px",
                      opacity: 0.7,
                      fontSize: "0.65rem",
                    }}
                  >
                    Total Income This Month
                  </Typography>
                  <Chip
                    label={tier.label}
                    size="small"
                    sx={{
                      height: 24,
                      bgcolor: tier.chipBg,
                      color: tier.color,
                      fontWeight: 800,
                      fontSize: "0.6rem",
                      border: `1px solid ${alpha(tier.color, 0.15)}`,
                    }}
                  />
                </Stack>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: "-1.5px",
                    mb: 0.5,
                  }}
                >
                  ₹{Math.round(stats.totalIncome).toLocaleString()}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: tier.color,
                    opacity: 0.85,
                    transition: "color 0.3s ease",
                  }}
                >
                  {tier.msg}
                </Typography>
              </Box>

              {/* Middle section — Stats row */}
              <Box
                sx={{
                  mx: 2,
                  mb: 2,
                  p: 2.5,
                  borderRadius: "20px",
                  bgcolor:
                    mode === "light"
                      ? alpha(theme.palette.background.paper, 0.65)
                      : alpha(theme.palette.background.paper, 0.35),
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  {/* NET AVAILABLE */}
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        opacity: 0.6,
                        mb: 0.5,
                        fontSize: "0.6rem",
                        letterSpacing: "0.8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Net Available
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 900,
                        color:
                          stats.remainingBalance < 0 ? "#d32f2f" : "#2e7d32",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      ₹{Math.round(stats.remainingBalance).toLocaleString()}
                    </Typography>
                  </Box>

                  {/* Divider */}
                  <Box
                    sx={{
                      width: "1px",
                      height: 40,
                      bgcolor: theme.palette.divider,
                      opacity: 0.3,
                    }}
                  />

                  {/* SPENT */}
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        opacity: 0.6,
                        mb: 0.5,
                        fontSize: "0.6rem",
                        letterSpacing: "0.8px",
                        textTransform: "uppercase",
                        justifyContent: "flex-end",
                      }}
                    >
                      <TrendDown size={12} weight="bold" color={tier.color} />{" "}
                      Spent
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 900,
                        color: tier.color,
                        letterSpacing: "-0.5px",
                        transition: "color 0.3s ease",
                      }}
                    >
                      ₹{Math.round(stats.monthlyTotal).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>

                {/* Progress Bar */}
                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, opacity: 0.5, fontSize: "0.6rem" }}
                    >
                      Spending vs Income
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: tier.color,
                        fontSize: "0.65rem",
                      }}
                    >
                      {Math.round(pct)}%
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      height: 6,
                      bgcolor: alpha(theme.palette.divider, 0.1),
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{
                        height: "100%",
                        backgroundColor: tier.color,
                        borderRadius: 3,
                        transition: "background-color 0.5s ease",
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Bottom — Action button */}
              <Box sx={{ px: 2, pb: 2.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => setIsIncomeModalOpen(true)}
                  startIcon={<Coins weight="bold" size={18} />}
                  disableElevation
                  sx={{
                    bgcolor: "primary.main",
                    color: mode === "light" ? "white" : "#041e49",
                    borderRadius: "16px",
                    py: 1.8,
                    fontSize: "0.85rem",
                    textTransform: "none",
                    fontWeight: 800,
                    letterSpacing: "-0.2px",
                    "&:hover": {
                      bgcolor: mode === "light" ? "primary.dark" : "#d3e3fd",
                      transform: "translateY(-1px)",
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`,
                    },
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  Add Income Credit
                </Button>
              </Box>
            </Card>
          );
        })()}

        {/* 3. Roommate Balances Section */}
        <Box sx={{ mb: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1.5, px: 1 }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, color: "text.primary" }}
            >
              Roommate Net
            </Typography>
            <IconButton
              size="small"
              onClick={() => recalculateMutation.mutate()}
              sx={{ color: "primary.main" }}
            >
              <ArrowsClockwise size={16} weight="bold" />
            </IconButton>
          </Stack>
          <Stack spacing={1}>
            {transData.balances
              ?.filter((b) => Math.abs(parseFloat(b.balance)) > 1)
              .map((balance, index) => {
                const amount = parseFloat(balance.balance);
                const isOwed = amount > 0;
                const member = membersData?.members?.find(
                  (m) => m.id === balance.other_user_id,
                ) || { name: "Roomie" };

                return (
                  <Card
                    key={index}
                    onClick={() => {
                      setSelectedRoommate({ ...member, balance: amount });
                      setIsRoommateModalOpen(true);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        bgcolor: "action.hover",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: "secondary.container",
                          color: "secondary.onContainer",
                          fontWeight: 800,
                          fontSize: "0.85rem",
                        }}
                      >
                        {member.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {member.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: isOwed ? "success.main" : "error.main",
                            fontWeight: 700,
                          }}
                        >
                          {isOwed ? `owes you` : `you owe`}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 900,
                        color: isOwed ? "success.main" : "error.main",
                      }}
                    >
                      ₹{Math.round(Math.abs(amount))}
                    </Typography>
                  </Card>
                );
              })}
          </Stack>
        </Box>

        {/* 4. Recent Activity */}
        <Box sx={{ mb: 4 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1.5, px: 1 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Recent History
            </Typography>
            <Chip
              label={`${filteredTransactions.length} items`}
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: "action.hover",
                fontSize: "0.7rem",
              }}
            />
          </Stack>

          <Stack spacing={1}>
            {filteredTransactions.slice(0, visibleCount).map((t) => {
              const isPayer = parseInt(t.user_id) === parseInt(user.id);
              const catMatch = t.description.match(/^\[(.*?)\]/);
              const catId = catMatch ? catMatch[1].toLowerCase() : "other";
              const cat =
                CATEGORIES.find((c) => c.id === catId) || CATEGORIES[7];
              const displayDesc = t.description.replace(/^\[.*?\]\s*/, "");
              const payer = membersData?.members?.find(
                (m) => m.id === t.user_id,
              );

              return (
                <Card
                  key={t.id}
                  onClick={() => {
                    setSelectedExpense(t);
                    setIsDetailModalOpen(true);
                  }}
                  sx={{
                    p: 1.5,
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    boxShadow: "none",
                    border:
                      mode === "light"
                        ? "1px solid #f1f5f9"
                        : "1px solid rgba(255,255,255,0.05)",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        bgcolor: alpha(cat.color, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: cat.color,
                      }}
                    >
                      <cat.icon size={20} weight="duotone" />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {displayDesc}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: "text.secondary",
                          fontSize: "0.75rem",
                        }}
                      >
                        {isPayer ? "You" : payer?.name || "Roomie"} paid • ₹
                        {Math.round(parseFloat(t.amount))}
                      </Typography>
                    </Box>
                  </Stack>
                  <CaretRight
                    size={16}
                    weight="bold"
                    color={theme.palette.text.disabled}
                  />
                </Card>
              );
            })}
            {visibleCount < filteredTransactions.length && (
              <Button
                fullWidth
                onClick={() => setVisibleCount((v) => v + 15)}
                sx={{
                  py: 1,
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.75rem",
                }}
              >
                LOAD MORE
              </Button>
            )}
          </Stack>
        </Box>
      </Container>

      {/* TRULY FLOATING ADD BUTTON */}
      <Box sx={{ position: "fixed", bottom: 90, right: 20, zIndex: 1000 }}>
        <Button
          variant="contained"
          startIcon={<Plus size={20} weight="bold" />}
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          sx={{
            borderRadius: "18px",
            py: 1.5,
            px: 2.5,
            fontWeight: 900,
            textTransform: "none",
            bgcolor: "primary.main",
            color: "white",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
            "&:hover": {
              bgcolor: "primary.dark",
              transform: "translateY(-2px)",
            },
            transition: "all 0.2s",
          }}
        >
          Add Expense
        </Button>
      </Box>

      <Dialog
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        fullWidth
        maxWidth={false}
        sx={{
          "& .MuiDialog-container": {
            p: 0,
            m: 0,
          },
          "& .MuiDialog-paper": {
            margin: "8px", // Minimal 8px gap on all sides
            width: "calc(100% - 16px)",
            maxWidth: "calc(100vw - 16px) !important",
            borderRadius: "24px",
            maxHeight: "96vh",
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
            boxShadow: "none",
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            fontWeight: 500,
            px: 2.5,
            pt: 4,
            pb: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}
          >
            Add Expense
          </Typography>
          <IconButton
            onClick={() => setIsAddModalOpen(false)}
            size="small"
            sx={{ color: "text.secondary", bgcolor: "action.hover" }}
          >
            <X size={20} weight="bold" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, pb: 2, pt: 2, overflowY: "auto" }}>
          <Stack spacing={4} sx={{ mt: 1 }}>
            {/* 2. Collapsible Category Picker */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  display: "block",
                  mb: 1.5,
                  ml: 0.5,
                  letterSpacing: "1px",
                }}
              >
                CATEGORY
              </Typography>

              {/* Selector Row */}
              <Paper
                elevation={0}
                onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                sx={{
                  p: 1.5,
                  px: 2,
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: CATEGORIES.find((c) => c.id === category)?.color,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {React.createElement(
                      CATEGORIES.find((c) => c.id === category)?.icon,
                      { size: 20, weight: "bold" },
                    )}
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {CATEGORIES.find((c) => c.id === category)?.label}
                  </Typography>
                </Stack>
                <CaretDown
                  size={20}
                  weight="bold"
                  style={{
                    transform: isCategoryExpanded ? "rotate(180deg)" : "none",
                    transition: "0.3s",
                    opacity: 0.5,
                  }}
                />
              </Paper>

              <Collapse in={isCategoryExpanded}>
                <Paper
                  elevation={0}
                  sx={{
                    mt: 1.5,
                    p: 2,
                    borderRadius: "20px",
                    bgcolor: "action.hover",
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Grid container spacing={1}>
                    {CATEGORIES.map((cat) => (
                      <Grid size={{ xs: 4, sm: 3 }} key={cat.id}>
                        <Box
                          onClick={() => {
                            setCategory(cat.id);
                            setIsCategoryExpanded(false);
                          }}
                          sx={{
                            p: 1.5,
                            borderRadius: "14px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            bgcolor:
                              category === cat.id
                                ? "primary.main"
                                : "background.paper",
                            color:
                              category === cat.id ? "white" : "text.primary",
                            border: `1px solid ${category === cat.id ? "transparent" : alpha(theme.palette.divider, 0.15)}`,
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            },
                          }}
                        >
                          <cat.icon
                            size={22}
                            weight={category === cat.id ? "fill" : "bold"}
                          />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 800, fontSize: "0.65rem" }}
                          >
                            {cat.label.toUpperCase()}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Collapse>
            </Box>
            {/* 1. Description & Amount Grid */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Description"
                  placeholder="What was this for?"
                  fullWidth
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  variant="outlined"
                  InputProps={{ sx: { borderRadius: "16px", fontWeight: 600 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Amount"
                  placeholder="0.00"
                  type="number"
                  fullWidth
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <Typography
                        sx={{ mr: 1, fontWeight: 700, color: "text.secondary" }}
                      >
                        ₹
                      </Typography>
                    ),
                    sx: {
                      borderRadius: "16px",
                      fontWeight: 800,
                      fontSize: "1.1rem",
                    },
                  }}
                />
              </Grid>
            </Grid>

            {/* 5. Settlement Notice (Moved below Category) */}
            <AnimatePresence>
              {isSettlement && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: "20px",
                      bgcolor: alpha(theme.palette.success.main, 0.08),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "12px",
                        bgcolor: "success.main",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Handshake size={24} weight="bold" />
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 900,
                          color: "success.dark",
                          lineHeight: 1.2,
                        }}
                      >
                        Settlement Entry
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: "success.main",
                          mt: 0.5,
                          display: "block",
                        }}
                      >
                        Clearance between you and{" "}
                        {
                          membersData?.members?.find(
                            (m) => parseInt(m.id) === parseInt(splitBetween[0]),
                          )?.name
                        }
                        .
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            <Grid container spacing={4}>
              {/* 3. Paid By Selector (Admin Only) */}
              {isAdmin && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary",
                      display: "block",
                      mb: 1.5,
                      ml: 0.5,
                      letterSpacing: "1px",
                    }}
                  >
                    PAID BY
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      overflowX: "auto",
                      pb: 1,
                      "&::-webkit-scrollbar": { display: "none" },
                    }}
                  >
                    {membersData?.members?.map((m) => {
                      const isSelected = parseInt(paidBy) === parseInt(m.id);
                      return (
                        <Box
                          key={m.id}
                          onClick={() => setPaidBy(m.id)}
                          sx={{
                            minWidth: 70,
                            p: 1,
                            borderRadius: "16px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            border: `2px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.05)}`,
                            bgcolor: isSelected
                              ? alpha(theme.palette.primary.main, 0.04)
                              : "transparent",
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: isSelected ? "primary.main" : "divider",
                              color: isSelected ? "white" : "text.primary",
                              fontWeight: 800,
                              fontSize: "0.8rem",
                            }}
                          >
                            {m.name.charAt(0)}
                          </Avatar>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.65rem",
                              color: isSelected
                                ? "primary.main"
                                : "text.secondary",
                            }}
                          >
                            {m.name.split(" ")[0]}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Grid>
              )}

              {/* 4. Split Between Checklist */}
              <Grid size={{ xs: 12, sm: isAdmin ? 6 : 12 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    display: "block",
                    mb: 1.5,
                    ml: 0.5,
                    letterSpacing: "1px",
                  }}
                >
                  SPLIT WITH
                </Typography>
                <Stack spacing={1}>
                  {membersData?.members?.map((m) => {
                    const isSelected = splitBetween
                      .map((id) => parseInt(id))
                      .includes(parseInt(m.id));
                    return (
                      <Card
                        key={m.id}
                        onClick={() =>
                          setSplitBetween((s) =>
                            isSelected
                              ? s.filter(
                                  (id) => parseInt(id) !== parseInt(m.id),
                                )
                              : [...s, m.id],
                          )
                        }
                        variant="outlined"
                        sx={{
                          p: 1.2,
                          borderRadius: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          borderColor: isSelected ? "primary.main" : "divider",
                          bgcolor: isSelected
                            ? alpha(theme.palette.primary.main, 0.04)
                            : "transparent",
                        }}
                      >
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "6px",
                            border: "2px solid",
                            borderColor: isSelected
                              ? "primary.main"
                              : theme.palette.divider,
                            bgcolor: isSelected
                              ? "primary.main"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                          }}
                        >
                          {isSelected && <Check size={14} weight="bold" />}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, flex: 1, fontSize: "0.85rem" }}
                        >
                          {m.name}{" "}
                          {parseInt(m.id) === parseInt(user?.id) ? "(You)" : ""}
                        </Typography>
                      </Card>
                    );
                  })}
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, pb: 4, pt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={
              !amount ||
              !desc ||
              splitBetween.length === 0 ||
              addMutation.isPending
            }
            onClick={() =>
              addMutation.mutate({
                description: `[${category.toUpperCase()}] ${desc}`,
                amount: parseFloat(amount),
                split_between: splitBetween,
                paid_by: paidBy,
              })
            }
            sx={{
              py: 1.8,
              borderRadius: "16px",
              fontWeight: 900,
              fontSize: "1.1rem",
              textTransform: "none",
              boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            {addMutation.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Save Expense"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ROOMMATE DUES MODAL */}
      <Dialog
        open={isRoommateModalOpen}
        onClose={() => setIsRoommateModalOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: "32px", p: 0.5 } }}
      >
        {selectedRoommate &&
          (() => {
            const roommateTx = filteredTransactions.filter((t) => {
              const payerId = parseInt(t.user_id);
              let split = [];
              try {
                split =
                  typeof t.split_between === "string"
                    ? JSON.parse(t.split_between)
                    : t.split_between || [];
              } catch (e) {}
              const myId = parseInt(user.id);
              const targetId = parseInt(selectedRoommate.id);
              return (
                (payerId === myId && split.includes(targetId)) ||
                (payerId === targetId && split.includes(myId))
              );
            });

            const isOwed = selectedRoommate.balance > 0;

            return (
              <Box>
                <DialogTitle
                  sx={{
                    fontWeight: 800,
                    textAlign: "center",
                    pb: 0,
                    fontSize: "1rem",
                  }}
                >
                  {selectedRoommate.name}
                  <IconButton
                    onClick={() => setIsRoommateModalOpen(false)}
                    sx={{ position: "absolute", right: 12, top: 12 }}
                    size="small"
                  >
                    <X size={18} weight="bold" />
                  </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 2, pb: 3 }}>
                  <Stack spacing={3} sx={{ mt: 1 }}>
                    {/* Personal Balance Summary */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: isOwed
                          ? alpha(theme.palette.success.main, 0.05)
                          : alpha(theme.palette.error.main, 0.05),
                        borderRadius: "24px",
                        textAlign: "center",
                        border: `1.5px solid ${isOwed ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1)}`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          color: isOwed ? "success.main" : "error.main",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {selectedRoommate.name}{" "}
                        {isOwed ? "owes you" : "you owe"}
                      </Typography>
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 900,
                          color: isOwed ? "success.main" : "error.main",
                          mt: 0.5,
                        }}
                      >
                        ₹{Math.round(Math.abs(selectedRoommate.balance))}
                      </Typography>
                    </Box>

                    {/* Transactions List */}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          color: "text.secondary",
                          mb: 1.5,
                          display: "block",
                          letterSpacing: "0.5px",
                          fontSize: "0.65rem",
                        }}
                      >
                        TRANSACTIONS ({roommateTx.length})
                      </Typography>
                      <Stack
                        spacing={1}
                        sx={{
                          maxHeight: "420px",
                          overflowY: "auto",
                          pr: 0.5,
                          "&::-webkit-scrollbar": { width: 4 },
                          "&::-webkit-scrollbar-thumb": {
                            bgcolor: "divider",
                            borderRadius: 4,
                          },
                        }}
                      >
                        {roommateTx.length > 0 ? (
                          roommateTx.map((t) => {
                            const catMatch = t.description.match(/^\[(.*?)\]/);
                            const catId = catMatch
                              ? catMatch[1].toLowerCase()
                              : "other";
                            const cat =
                              CATEGORIES.find((c) => c.id === catId) ||
                              CATEGORIES[13];
                            const displayDesc = t.description.replace(
                              /^\[.*?\]\s*/,
                              "",
                            );
                            const payerId = parseInt(t.user_id);
                            const myId = parseInt(user.id);
                            let split = [];
                            try {
                              split =
                                typeof t.split_between === "string"
                                  ? JSON.parse(t.split_between)
                                  : t.split_between || [];
                            } catch (e) {}
                            const share =
                              parseFloat(t.amount) / (split.length || 1);
                            const userPaid = payerId === myId;

                            return (
                              <Box
                                key={t.id}
                                sx={{
                                  p: 1.5,
                                  borderRadius: "16px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  bgcolor: alpha(theme.palette.divider, 0.03),
                                  border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "10px",
                                    bgcolor: alpha(cat.color, 0.1),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: cat.color,
                                    flexShrink: 0,
                                  }}
                                >
                                  <cat.icon size={18} weight="duotone" />
                                </Box>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: "0.8rem",
                                      lineHeight: 1.2,
                                      mb: 0.2,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {displayDesc}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "text.secondary",
                                      fontWeight: 600,
                                      fontSize: "0.65rem",
                                      display: "flex",
                                      gap: 0.5,
                                      alignItems: "center",
                                    }}
                                  >
                                    {new Date(t.created_at).toLocaleDateString(
                                      undefined,
                                      { day: "numeric", month: "short" },
                                    )}{" "}
                                    •{" "}
                                    {userPaid
                                      ? "You paid"
                                      : `${selectedRoommate.name.split(" ")[0]} paid`}
                                  </Typography>
                                </Box>

                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 900,
                                    color: userPaid
                                      ? "success.main"
                                      : "error.main",
                                    flexShrink: 0,
                                    ml: 1,
                                  }}
                                >
                                  {userPaid ? "+" : "-"}₹{Math.round(share)}
                                </Typography>
                              </Box>
                            );
                          })
                        ) : (
                          <Box
                            sx={{ textAlign: "center", py: 4, opacity: 0.5 }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600 }}
                            >
                              No active dues found
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </DialogContent>
              </Box>
            );
          })()}
      </Dialog>

      <Dialog
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: "32px", p: 0.5 } }}
      >
        {selectedExpense &&
          (() => {
            const payer = membersData?.members?.find(
              (m) => m.id === selectedExpense.user_id,
            ) || { name: "Roomie" };
            let splitIds = [];
            try {
              splitIds =
                typeof selectedExpense.split_between === "string"
                  ? JSON.parse(selectedExpense.split_between)
                  : selectedExpense.split_between || [];
            } catch (e) {}
            const share =
              parseFloat(selectedExpense.amount) / (splitIds.length || 1);

            return (
              <Box>
                <DialogTitle
                  sx={{
                    fontWeight: 800,
                    textAlign: "center",
                    pb: 0,
                    fontSize: "1rem",
                  }}
                >
                  Entry Details
                  <IconButton
                    onClick={() => setIsDetailModalOpen(false)}
                    sx={{ position: "absolute", right: 12, top: 12 }}
                    size="small"
                  >
                    <X size={18} weight="bold" />
                  </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 2.5, pb: 2.5 }}>
                  <Stack spacing={2.5} sx={{ mt: 1 }}>
                    <Box
                      sx={{
                        p: 2.5,
                        bgcolor: "action.hover",
                        borderRadius: "24px",
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 800, mb: 0.5 }}
                      >
                        {selectedExpense.description}
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 900, color: "primary.main" }}
                      >
                        ₹{Math.round(parseFloat(selectedExpense.amount))}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        alignItems="center"
                        sx={{ mt: 1, opacity: 0.7 }}
                      >
                        <CalendarBlank size={14} weight="bold" />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {new Date(
                            selectedExpense.created_at,
                          ).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Typography>
                      </Stack>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          color: "text.secondary",
                          mb: 1,
                          display: "block",
                          letterSpacing: "0.5px",
                          fontSize: "0.65rem",
                        }}
                      >
                        PAYMENT INFO
                      </Typography>
                      <Card
                        variant="filled"
                        sx={{
                          p: 1.5,
                          borderRadius: "16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          bgcolor: "primary.container",
                          color: "primary.onContainer",
                          border: "none",
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: "white",
                            color: "primary.main",
                            fontWeight: 800,
                            fontSize: "0.8rem",
                          }}
                        >
                          {payer.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {payer.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, opacity: 0.8 }}
                          >
                            Paid the full amount
                          </Typography>
                        </Box>
                      </Card>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          color: "text.secondary",
                          mb: 1,
                          display: "block",
                          letterSpacing: "0.5px",
                          fontSize: "0.65rem",
                        }}
                      >
                        INDIVIDUAL SHARES
                      </Typography>
                      <Stack spacing={0.8}>
                        {splitIds.map((id) => {
                          const m = membersData?.members?.find(
                            (mem) => mem.id === id,
                          );
                          return (
                            <Box
                              key={id}
                              sx={{
                                px: 2,
                                py: 1.2,
                                borderRadius: "14px",
                                bgcolor: "action.hover",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 700 }}
                              >
                                {m?.name || "Group Member"}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 900 }}
                              >
                                ₹{Math.round(share)}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
                  {parseInt(selectedExpense.user_id) === parseInt(user.id) && (
                    <Button
                      fullWidth
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        setExpenseToDelete(selectedExpense);
                        setIsDeleteModalOpen(true);
                      }}
                      color="error"
                      sx={{ fontWeight: 800, fontSize: "0.75rem" }}
                    >
                      Remove This Expense
                    </Button>
                  )}
                </DialogActions>
              </Box>
            );
          })()}
      </Dialog>

      {/* 2. Add Income Modal */}
      <Dialog
        open={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        PaperProps={{
          sx: { borderRadius: "32px", p: 1, maxWidth: "450px", width: "95%" },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, px: 3, pt: 3 }}>
          Add Income Source
          <IconButton
            onClick={() => setIsIncomeModalOpen(false)}
            sx={{ position: "absolute", right: 12, top: 12 }}
            size="small"
          >
            <X size={18} weight="bold" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Typography sx={{ mr: 1, fontWeight: 700 }}>₹</Typography>
                ),
                sx: { borderRadius: "16px", fontWeight: 800 },
              }}
            />

            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  display: "block",
                  mb: 1.5,
                  ml: 0.5,
                }}
              >
                SOURCE
              </Typography>
              <Grid container spacing={1}>
                {INCOME_SOURCES.map((src) => (
                  <Grid size={4} key={src.id}>
                    <Box
                      onClick={() => setIncomeSource(src.id)}
                      sx={{
                        p: 1.5,
                        borderRadius: "16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        transition: "0.2s",
                        border: `2px solid ${incomeSource === src.id ? src.color : alpha(theme.palette.divider, 0.1)}`,
                        bgcolor:
                          incomeSource === src.id
                            ? alpha(src.color, 0.1)
                            : "transparent",
                        color:
                          incomeSource === src.id ? src.color : "text.primary",
                        "&:hover": { bgcolor: alpha(src.color, 0.05) },
                      }}
                    >
                      <src.icon
                        size={20}
                        weight={incomeSource === src.id ? "fill" : "bold"}
                      />
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 800, fontSize: "0.65rem" }}
                      >
                        {src.label.toUpperCase()}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <TextField
              fullWidth
              label="Description (Optional)"
              placeholder="e.g., February salary"
              value={incomeDesc}
              onChange={(e) => setIncomeDesc(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "16px" } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() =>
              addIncomeMutation.mutate({
                amount: incomeAmount,
                source: incomeSource,
                description: incomeDesc,
              })
            }
            sx={{ borderRadius: "16px", py: 1.5, fontWeight: 800 }}
          >
            Add Income Credit
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        PaperProps={{ sx: { borderRadius: "40px" } }}
      >
        <DialogContent sx={{ textAlign: "center", p: 5 }}>
          <Box
            sx={{
              bgcolor: "error.container",
              color: "error.main",
              width: 80,
              height: 80,
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <Warning size={48} weight="bold" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Permanently Delete?
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 600, mt: 1 }}
          >
            This record will be removed from everyone's wallet.
          </Typography>
          <Stack spacing={2} sx={{ mt: 5 }}>
            <Button
              fullWidth
              variant="contained"
              color="error"
              onClick={() => deleteMutation.mutate(expenseToDelete.id)}
              sx={{ borderRadius: "20px", py: 2, fontWeight: 800 }}
            >
              Yes, Delete Recording
            </Button>
            <Button
              fullWidth
              onClick={() => setIsDeleteModalOpen(false)}
              sx={{ fontWeight: 800, color: "text.secondary" }}
            >
              Keep Expense
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Wallet;
