import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Grid,
  Stack,
  useTheme,
  alpha,
  LinearProgress,
  Chip,
  IconButton,
  Avatar,
  CircularProgress,
  Collapse,
  Button,
  Divider,
  Paper,
  Tab,
  Tabs,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  ChartPieSlice,
  Users,
  User,
  Handshake,
  Warning,
  WarningCircle,
  CaretDown,
  CalendarBlank,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  PiggyBank,
  Tag,
  DotsThree,
  Hamburger,
  ShoppingCart,
  Car,
  FirstAid,
  FilmStrip,
  ShoppingBag,
  House,
  Lightning,
  CaretRight,
  TrendUp,
  TrendDown,
  Vault,
  Receipt,
  Funnel,
  ArrowRight,
  ArrowsLeftRight,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import useAuthStore from "../store/auth";

const CATEGORIES = {
  food: { icon: <Hamburger size={22} />, color: "#f59e0b", label: "Dining" },
  groceries: {
    icon: <ShoppingCart size={22} />,
    color: "#10b981",
    label: "Groceries",
  },
  transport: { icon: <Car size={22} />, color: "#3b82f6", label: "Ride" },
  utilities: {
    icon: <Lightning size={22} />,
    color: "#8b5cf6",
    label: "Bills",
  },
  entertainment: {
    icon: <FilmStrip size={22} />,
    color: "#ec4899",
    label: "Fun",
  },
  shopping: {
    icon: <ShoppingBag size={22} />,
    color: "#06b6d4",
    label: "Shop",
  },
  health: { icon: <FirstAid size={22} />, color: "#ef4444", label: "Health" },
  rent: { icon: <House size={22} />, color: "#6366f1", label: "Rent" },
  other: { icon: <DotsThree size={22} />, color: "#64748b", label: "Other" },
};

const detectCategory = (description) => {
  const desc = description.toLowerCase();
  if (
    desc.includes("food") ||
    desc.includes("lunch") ||
    desc.includes("dinner") ||
    desc.includes("breakfast") ||
    desc.includes("restaurant") ||
    desc.includes("cafe") ||
    desc.includes("pizza") ||
    desc.includes("burger")
  )
    return "food";
  if (
    desc.includes("grocery") ||
    desc.includes("vegetables") ||
    desc.includes("milk") ||
    desc.includes("bread") ||
    desc.includes("eggs")
  )
    return "groceries";
  if (
    desc.includes("uber") ||
    desc.includes("ola") ||
    desc.includes("taxi") ||
    desc.includes("petrol") ||
    desc.includes("fuel") ||
    desc.includes("gas") ||
    desc.includes("transport") ||
    desc.includes("metro") ||
    desc.includes("bus")
  )
    return "transport";
  if (
    desc.includes("electric") ||
    desc.includes("water") ||
    desc.includes("wifi") ||
    desc.includes("internet") ||
    desc.includes("bill") ||
    desc.includes("recharge")
  )
    return "utilities";
  if (
    desc.includes("movie") ||
    desc.includes("netflix") ||
    desc.includes("spotify") ||
    desc.includes("game") ||
    desc.includes("concert")
  )
    return "entertainment";
  if (
    desc.includes("amazon") ||
    desc.includes("flipkart") ||
    desc.includes("shop") ||
    desc.includes("clothes") ||
    desc.includes("shoes")
  )
    return "shopping";
  if (
    desc.includes("medicine") ||
    desc.includes("doctor") ||
    desc.includes("hospital") ||
    desc.includes("pharmacy")
  )
    return "health";
  if (
    desc.includes("rent") ||
    desc.includes("deposit") ||
    desc.includes("maintenance")
  )
    return "rent";
  return "other";
};

// --- Styled Components & Subparts ---

const CommandCenter = ({ stats, status, periodLabel }) => {
  const theme = useTheme();

  // Period Split
  const total = stats.activeShared + stats.activePersonal || 1;
  const sharedPct = (stats.activeShared / total) * 100;
  const personalPct = (stats.activePersonal / total) * 100;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: "32px",
        background:
          theme.palette.mode === "dark"
            ? `linear-gradient(135deg, #0f172a 0%, #111827 50%, #1e1b4b 100%)`
            : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        color: "white",
        position: "relative",
        overflow: "hidden",
        mb: 3,
        boxShadow:
          theme.palette.mode === "dark"
            ? `0 20px 40px rgba(0,0,0,0.4)`
            : `0 20px 40px ${alpha(theme.palette.primary.main, 0.25)}`,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          filter: "blur(50px)",
        }}
      />

      <Stack spacing={3} sx={{ position: "relative", zIndex: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ fontWeight: 800, opacity: 0.8, letterSpacing: "1px" }}
            >
              {periodLabel} OUTFLOW
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              ₹{Math.round(stats.activeSpent).toLocaleString()}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={status.label}
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: 800,
              border: "1px solid rgba(255,255,255,0.3)",
              fontSize: "0.65rem",
            }}
          />
        </Stack>

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, opacity: 0.8 }}
            >
              EXPENSE SPLIT
            </Typography>
            <Stack direction="row" spacing={2}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "white",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 900, fontSize: "0.65rem" }}
                >
                  {sharedPct.toFixed(0)}% Shared
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "rgba(255,255,255,0.4)",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 900, fontSize: "0.65rem" }}
                >
                  {personalPct.toFixed(0)}% Personal
                </Typography>
              </Stack>
            </Stack>
          </Stack>
          <Box
            sx={{
              height: 10,
              bgcolor: "rgba(255,255,255,0.15)",
              borderRadius: 5,
              overflow: "hidden",
              display: "flex",
            }}
          >
            <Box
              sx={{
                width: `${sharedPct}%`,
                height: "100%",
                bgcolor: "white",
                transition: "width 0.5s ease-out",
              }}
            />
            <Box
              sx={{
                width: `${personalPct}%`,
                height: "100%",
                bgcolor: "rgba(255,255,255,0.4)",
                transition: "width 0.5s ease-out",
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: "rgba(0,0,0,0.1)",
            p: 2,
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, opacity: 0.8 }}
            >
              BUDGET UTILIZATION
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 900 }}>
              {stats.budgetPercent.toFixed(0)}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, stats.budgetPercent)}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.2)",
              "& .MuiLinearProgress-bar": {
                bgcolor: "#fff",
                borderRadius: 3,
                boxShadow: "0 0 10px rgba(255,255,255,0.5)",
              },
            }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, fontSize: "0.65rem", opacity: 0.9 }}
            >
              Available: ₹
              {Math.max(
                0,
                stats.monthlyBudget - stats.activeSpent,
              ).toLocaleString()}
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, fontSize: "0.65rem", opacity: 0.9 }}
            >
              Limit: ₹{stats.monthlyBudget.toLocaleString()}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

const QuickStats = ({ stats }) => {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            flex: 1,
            borderRadius: "28px",
            background:
              theme.palette.mode === "dark"
                ? `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha("#000", 0.3)} 100%)`
                : alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.15 : 0.1)}`,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{ position: "absolute", top: -10, right: -10, opacity: 0.1 }}
          >
            <Users size={72} weight="fill" />
          </Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1, position: "relative", zIndex: 1 }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "10px",
                bgcolor: "primary.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={18} weight="bold" />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "primary.main",
                letterSpacing: "0.5px",
              }}
            >
              GROUP
            </Typography>
          </Stack>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, position: "relative", zIndex: 1 }}
          >
            ₹{Math.round(stats.activeShared).toLocaleString()}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "text.secondary",
              position: "relative",
              zIndex: 1,
            }}
          >
            {stats.activeSharedCount} expenses
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            flex: 1,
            borderRadius: "28px",
            background:
              theme.palette.mode === "dark"
                ? `linear-gradient(160deg, ${alpha(theme.palette.secondary.main, 0.12)} 0%, ${alpha("#000", 0.3)} 100%)`
                : alpha(theme.palette.secondary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.15 : 0.1)}`,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{ position: "absolute", top: -10, right: -10, opacity: 0.1 }}
          >
            <User size={72} weight="fill" />
          </Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1, position: "relative", zIndex: 1 }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "10px",
                bgcolor: "secondary.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={18} weight="bold" />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "secondary.main",
                letterSpacing: "0.5px",
              }}
            >
              PERSONAL
            </Typography>
          </Stack>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, position: "relative", zIndex: 1 }}
          >
            ₹{Math.round(stats.activePersonal).toLocaleString()}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "text.secondary",
              position: "relative",
              zIndex: 1,
            }}
          >
            {stats.activePersonalCount} items
          </Typography>
        </Paper>
      </Stack>

      {/* Settlements Card */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "28px",
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(160deg, ${alpha("#00acc1", 0.12)} 0%, ${alpha("#000", 0.3)} 100%)`
              : alpha("#00acc1", 0.08),
          border: `1px solid ${alpha("#00acc1", theme.palette.mode === "dark" ? 0.15 : 0.1)}`,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          sx={{ position: "absolute", bottom: -20, right: -20, opacity: 0.1 }}
        >
          <ArrowsLeftRight size={100} weight="fill" />
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "16px",
            bgcolor: "#00acc1",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 16px ${alpha("#00acc1", 0.3)}`,
          }}
        >
          <ArrowsLeftRight size={24} weight="bold" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, color: "#00acc1", letterSpacing: "0.5px" }}
          >
            SETTLEMENTS
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            ₹{Math.round(stats.activeSettlements).toLocaleString()}
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "text.secondary" }}
          >
            {stats.activeSettlementsCount} transfers
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

const CategoryList = ({ categories, total }) => {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 2.5, px: 1 }}
      >
        <Tag size={20} weight="bold" />
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          Spending Pulse
        </Typography>
      </Stack>
      <Stack spacing={1.5}>
        {categories.map((cat) => (
          <Paper
            key={cat.id}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "24px",
              bgcolor:
                theme.palette.mode === "dark"
                  ? alpha(cat.color, 0.1)
                  : alpha(cat.color, 0.04),
              border: `1px solid ${alpha(cat.color, theme.palette.mode === "dark" ? 0.15 : 0.08)}`,
              display: "flex",
              alignItems: "center",
              gap: 2,
              transition: "all 0.2s",
              "&:active": { transform: "scale(0.98)" },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                bgcolor: alpha(cat.color, 0.1),
                color: cat.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cat.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  mb: 0.5,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {cat.label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  ₹{Math.round(cat.value).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={(cat.value / total) * 100}
                  sx={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? alpha(cat.color, 0.2)
                        : alpha(cat.color, 0.1),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: cat.color,
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 900,
                    color: cat.color,
                    minWidth: 28,
                    textAlign: "right",
                  }}
                >
                  {((cat.value / total) * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

const SpendingTrends = ({ sortedMonths, monthlyData }) => {
  const theme = useTheme();
  const data = [...sortedMonths].reverse();
  const maxVal = Math.max(...data.map((m) => monthlyData[m].total)) || 1;

  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 3, px: 1 }}
      >
        <TrendUp size={20} weight="bold" />
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          Outflow Trends
        </Typography>
      </Stack>
      <Stack
        direction="row"
        alignItems="flex-end"
        spacing={1}
        sx={{ height: 140, px: 0.5 }}
      >
        {data.map((mKey) => {
          const month = monthlyData[mKey];
          const height = Math.max((month.total / maxVal) * 100, 5);
          return (
            <Box
              key={mKey}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                height: "100%",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 900,
                    fontSize: "0.6rem",
                    mb: 0.5,
                    color: "primary.main",
                  }}
                >
                  ₹
                  {month.total > 1000
                    ? (month.total / 1000).toFixed(1) + "k"
                    : Math.round(month.total)}
                </Typography>
                <Box
                  sx={{
                    width: "85%",
                    height: `${height}%`,
                    borderRadius: "8px 8px 4px 4px",
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.primary.main, 0.4)
                        : alpha(theme.palette.primary.main, 0.25),
                    border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.3 : 0.1)}`,
                    transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.65rem",
                  opacity: theme.palette.mode === "dark" ? 0.8 : 0.5,
                  letterSpacing: "0.5px",
                }}
              >
                {month.label.split(" ")[0].substring(0, 3).toUpperCase()}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

// --- Main Component ---

const Analytics = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [viewTab, setViewTab] = useState(0); // 0: Overview, 1: History, 2: Settlements
  const [expandedMonths, setExpandedMonths] = useState(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return { [key]: true };
  });
  const [anchorEl, setAnchorEl] = useState(null);

  const handleFilterClick = (event) => setAnchorEl(event.currentTarget);
  const handleFilterClose = (month) => {
    if (month !== undefined) setSelectedMonth(month);
    setAnchorEl(null);
  };

  const { data: transactionsData, isLoading: transLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get("/transactions/list").then((res) => res || {}),
  });

  const { data: membersData } = useQuery({
    queryKey: ["members"],
    queryFn: () => api.get("/group/members").then((res) => res || {}),
  });

  const stats = useMemo(() => {
    if (!transactionsData || !user || !membersData) return null;

    const transactions = transactionsData.transactions || [];
    const balances = transactionsData.balances || [];
    const members = membersData.members || [];

    const totalPendingFromOthers = balances
      .filter((b) => b.balance > 0)
      .reduce((sum, b) => sum + parseFloat(b.balance), 0);

    const myTransactions = transactions.filter((t) => {
      const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
      return splitBetween.includes(user.id) || t.user_id === user.id;
    });

    const monthlyData = {};
    const categoryTotals = {};
    const settlements = [];
    let totalShared = 0;
    let totalPersonal = 0;

    myTransactions.forEach((t) => {
      const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
      const myShare =
        splitBetween.length > 0
          ? parseFloat(t.amount) / splitBetween.length
          : 0;
      const isPersonal =
        t.user_id === user.id &&
        splitBetween.length === 1 &&
        splitBetween[0] === user.id;
      const isSettlement =
        splitBetween.length === 1 && splitBetween[0] !== t.user_id;

      if (isSettlement) {
        const isPaidByMe = t.user_id === user.id;
        const otherPersonId = isPaidByMe ? splitBetween[0] : t.user_id;
        const otherPerson = members.find((m) => m.id === otherPersonId);
        settlements.push({
          ...t,
          type: isPaidByMe ? "paid" : "received",
          otherPerson,
          otherPersonName: otherPerson ? otherPerson.name : "Unknown",
          amount: parseFloat(t.amount),
        });
        return;
      }

      const date = new Date(t.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          label: monthLabel,
          total: 0,
          shared: 0,
          personal: 0,
          transactions: [],
        };
      }

      const txWithMetadata = {
        ...t,
        myShare,
        isPersonal,
        category: detectCategory(t.description),
        payer: members.find((m) => m.id === t.user_id),
      };

      monthlyData[monthKey].transactions.push(txWithMetadata);

      if (selectedMonth === "all" || selectedMonth === monthKey) {
        categoryTotals[txWithMetadata.category] =
          (categoryTotals[txWithMetadata.category] || 0) + myShare;
        if (isPersonal) totalPersonal += myShare;
        else totalShared += myShare;
      }

      monthlyData[monthKey].total += myShare;
      if (isPersonal) monthlyData[monthKey].personal += myShare;
      else monthlyData[monthKey].shared += myShare;
    });

    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ ...CATEGORIES[key], value, id: key }));

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const activeMonthData =
      selectedMonth === "all"
        ? {
          shared: totalShared,
          personal: totalPersonal,
          total: totalShared + totalPersonal,
          transactions: myTransactions,
        }
        : monthlyData[selectedMonth] || {
          shared: 0,
          personal: 0,
          total: 0,
          transactions: [],
        };

    const activeSharedCount = activeMonthData.transactions.filter(
      (t) => !t.isPersonal,
    ).length;
    const activePersonalCount = activeMonthData.transactions.filter(
      (t) => t.isPersonal,
    ).length;

    const activeSettlements = settlements.filter((s) => {
      if (selectedMonth === "all") return true;
      const date = new Date(s.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonth;
    });

    const activeSettlementsTotal = activeSettlements.reduce(
      (sum, s) => sum + s.amount,
      0,
    );
    const activeSettlementsPaid = activeSettlements
      .filter((s) => s.type === "paid")
      .reduce((sum, s) => sum + s.amount, 0);
    const activeSettlementsReceived = activeSettlements
      .filter((s) => s.type === "received")
      .reduce((sum, s) => sum + s.amount, 0);

    const monthlyBudget = parseFloat(user?.monthly_budget || 0);
    const activeSpent = activeMonthData.total;
    const budgetPercent =
      monthlyBudget > 0
        ? (activeSpent /
          (selectedMonth === "all"
            ? monthlyBudget * sortedMonths.length
            : monthlyBudget)) *
        100
        : 0;

    return {
      activeShared: activeMonthData.shared,
      activePersonal: activeMonthData.personal,
      activeSharedCount,
      activePersonalCount,
      activeSettlements: activeSettlementsTotal,
      activeSettlementsPaid,
      activeSettlementsReceived,
      activeSettlementsCount: activeSettlements.length,
      activeSpent,
      totalExpenses: totalShared + totalPersonal,
      totalPendingFromOthers,
      topCategories,
      monthlyData,
      sortedMonths,
      monthlyBudget,
      budgetPercent,
      currentMonthKey,
      settlements,
      balances,
      members,
    };
  }, [transactionsData, user, selectedMonth, membersData]);

  const getBudgetStatus = (percent) => {
    if (percent >= 100)
      return { color: theme.palette.error.main, label: "OVER BUDGET" };
    if (percent >= 85)
      return { color: theme.palette.warning.main, label: "NEAR LIMIT" };
    return { color: theme.palette.success.main, label: "ON TRACK" };
  };

  if (transLoading)
    return (
      <Box
        sx={{
          p: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress color="primary" thickness={5} />
      </Box>
    );

  if (!stats) return null;

  const status = getBudgetStatus(stats.budgetPercent);

  return (
    <Container maxWidth="sm" disableGutters sx={{ py: 3, pb: 12, px: 2 }}>
      {/* 1. Dynamic Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 900, letterSpacing: "-1.5px" }}
        >
          Insights
        </Typography>
        <Button
          variant="tonal"
          onClick={handleFilterClick}
          startIcon={<CalendarBlank size={18} weight="bold" />}
          endIcon={<CaretDown size={14} weight="bold" />}
          sx={{
            borderRadius: "16px",
            px: 2,
            fontWeight: 800,
            bgcolor: "action.hover",
            color: "text.primary",
            textTransform: "none",
          }}
        >
          {selectedMonth === "all"
            ? "All Time"
            : stats.monthlyData[selectedMonth]?.label.split(" ")[0] || "Filter"}
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => handleFilterClose()}
          PaperProps={{
            sx: {
              borderRadius: "24px",
              mt: 1,
              minWidth: 160,
              boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
              border: `1px solid ${theme.palette.divider}`,
              p: 1,
            },
          }}
        >
          <MenuItem
            onClick={() => handleFilterClose("all")}
            sx={{ fontWeight: 700, py: 1.5, borderRadius: "12px" }}
          >
            All Time
          </MenuItem>
          <Divider sx={{ my: 0.5, borderStyle: "dashed" }} />
          {stats.sortedMonths.map((m) => (
            <MenuItem
              key={m}
              onClick={() => handleFilterClose(m)}
              selected={selectedMonth === m}
              sx={{ fontWeight: 600, py: 1.5, borderRadius: "12px" }}
            >
              {stats.monthlyData[m].label}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* 2. Insight Navigation */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: "20px",
          p: 0.5,
          mb: 3,
          bgcolor: alpha(theme.palette.divider, 0.05),
          border: "none",
        }}
      >
        <Tabs
          value={viewTab}
          onChange={(e, v) => setViewTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 44,
            "& .MuiTabs-indicator": {
              height: "100%",
              borderRadius: "16px",
              zIndex: 0,
              bgcolor: "background.paper",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            },
            "& .MuiTab-root": {
              zIndex: 1,
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.85rem",
            },
          }}
        >
          <Tab label="Overview" />
          <Tab label="Monthly" />
          <Tab label="Settles" />
        </Tabs>
      </Paper>

      <AnimatePresence mode="wait">
        {viewTab === 0 && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CommandCenter
              stats={stats}
              status={status}
              periodLabel={
                selectedMonth === "all"
                  ? "TOTAL"
                  : stats.monthlyData[selectedMonth]?.label
                    .split(" ")[0]
                    .toUpperCase()
              }
            />

            <QuickStats stats={stats} />

            {stats.totalPendingFromOthers > 0 && (
              <Paper
                elevation={0}
                sx={{
                  mb: 4,
                  p: 2.5,
                  borderRadius: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                  backgroundImage: `linear-gradient(45deg, transparent 25%, ${alpha(theme.palette.error.main, 0.05)} 25%, ${alpha(theme.palette.error.main, 0.05)} 50%, transparent 50%, transparent 75%, ${alpha(theme.palette.error.main, 0.05)} 75%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                  backgroundSize: "20px 20px",
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "16px",
                    bgcolor: "error.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 8px 16px ${alpha(theme.palette.error.main, 0.3)}`,
                  }}
                >
                  <Handshake size={24} weight="fill" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 900, color: "error.dark" }}
                  >
                    Collect Dues
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: "error.main", opacity: 0.8 }}
                  >
                    Others still owe you money
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 900, color: "error.main" }}
                >
                  ₹{Math.round(stats.totalPendingFromOthers).toLocaleString()}
                </Typography>
              </Paper>
            )}

            <CategoryList
              categories={stats.topCategories}
              total={stats.activeSpent || 1}
            />
          </motion.div>
        )}

        {viewTab === 1 && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SpendingTrends
              sortedMonths={stats.sortedMonths}
              monthlyData={stats.monthlyData}
            />

            <Stack spacing={2} sx={{ px: 1 }}>
              {stats.sortedMonths.map((mKey, idx) => {
                const month = stats.monthlyData[mKey];
                const prevMonthKey = stats.sortedMonths[idx + 1];
                const prevMonth = prevMonthKey
                  ? stats.monthlyData[prevMonthKey]
                  : null;
                const isExpanded = expandedMonths[mKey];

                const diff = prevMonth ? month.total - prevMonth.total : 0;
                const isUp = diff > 0;

                return (
                  <Paper
                    key={mKey}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "24px",
                      bgcolor: alpha(theme.palette.background.paper, 0.4),
                      border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      onClick={() =>
                        setExpandedMonths((prev) => ({
                          ...prev,
                          [mKey]: !prev[mKey],
                        }))
                      }
                      sx={{ mb: 1.5, cursor: "pointer" }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 900 }}
                        >
                          {month.label}
                        </Typography>
                        {prevMonth && (
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{ color: isUp ? "error.main" : "success.main" }}
                          >
                            {isUp ? (
                              <TrendUp size={12} weight="bold" />
                            ) : (
                              <TrendDown size={12} weight="bold" />
                            )}
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 900 }}
                            >
                              ₹{Math.abs(diff).toLocaleString()}{" "}
                              {isUp ? "more" : "less"}
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                          ₹{month.total.toFixed(0)}
                        </Typography>
                        <IconButton size="small">
                          <CaretDown
                            size={14}
                            weight="bold"
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "none",
                              transition: "0.2s",
                            }}
                          />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Collapse in={isExpanded}>
                      {/* Monthly Breakdown Pills */}
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: "12px",
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              fontWeight: 800,
                              color: "primary.main",
                              fontSize: "0.6rem",
                            }}
                          >
                            SHARED
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900 }}
                          >
                            ₹{Math.round(month.shared).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: "12px",
                            bgcolor: alpha(theme.palette.secondary.main, 0.05),
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              fontWeight: 800,
                              color: "secondary.main",
                              fontSize: "0.6rem",
                            }}
                          >
                            PERSONAL
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900 }}
                          >
                            ₹{Math.round(month.personal).toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack spacing={1}>
                        {month.transactions
                          .sort(
                            (a, b) =>
                              new Date(b.created_at) - new Date(a.created_at),
                          )
                          .map((t, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                mx: 1,
                                p: 1.5,
                                borderRadius: "16px",
                                bgcolor: "background.paper",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                              }}
                            >
                              <Avatar
                                src={
                                  t.payer?.profile_picture
                                    ? `https://prospine.in/roomOS/server/uploads/${t.payer.profile_picture}`
                                    : undefined
                                }
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "12px",
                                  bgcolor: t.isPersonal
                                    ? alpha(theme.palette.secondary.main, 0.1)
                                    : alpha(theme.palette.primary.main, 0.1),
                                  color: t.isPersonal
                                    ? "secondary.main"
                                    : "primary.main",
                                  fontWeight: 800,
                                  fontSize: "0.8rem",
                                }}
                              >
                                {t.payer?.name?.charAt(0)}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 800, lineHeight: 1.2 }}
                                >
                                  {t.description.replace(/^\[.*?\]\s*/, "")}
                                </Typography>
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, opacity: 0.6 }}
                                  >
                                    {new Date(t.created_at).toLocaleDateString(
                                      "en-US",
                                      { day: "numeric", month: "short" },
                                    )}
                                  </Typography>
                                  <DotSeparator />
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 800,
                                      color: CATEGORIES[t.category]?.color,
                                    }}
                                  >
                                    {CATEGORIES[
                                      t.category
                                    ]?.label.toUpperCase()}
                                  </Typography>
                                </Stack>
                              </Box>
                              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: 900 }}
                                >
                                  ₹{Math.round(t.myShare).toLocaleString()}
                                </Typography>
                                {t.isPersonal && (
                                  <Chip
                                    label="PERSONAL"
                                    size="small"
                                    sx={{
                                      height: 14,
                                      fontSize: "0.5rem",
                                      fontWeight: 900,
                                      bgcolor: "secondary.container",
                                      color: "secondary.onContainer",
                                      mt: 0.5,
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                          ))}
                      </Stack>
                    </Collapse>
                  </Paper>
                );
              })}
            </Stack>
          </motion.div>
        )}

        {viewTab === 2 && (
          <motion.div
            key="settles"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* 1. Settlements Summary */}
            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: "24px",
                  textAlign: "center",
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    fontWeight: 800,
                    color: "success.main",
                    mb: 0.5,
                    letterSpacing: "0.5px",
                  }}
                >
                  TOTAL PAID
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 900, color: "success.dark" }}
                >
                  ₹{Math.round(stats.activeSettlementsPaid).toLocaleString()}
                </Typography>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: "24px",
                  textAlign: "center",
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    fontWeight: 800,
                    color: "primary.main",
                    mb: 0.5,
                    letterSpacing: "0.5px",
                  }}
                >
                  RECEIVED
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 900, color: "primary.dark" }}
                >
                  ₹
                  {Math.round(stats.activeSettlementsReceived).toLocaleString()}
                </Typography>
              </Paper>
            </Stack>

            {/* 2. Settlements List */}
            {stats.settlements.length > 0 ? (
              <Stack spacing={2}>
                {stats.settlements
                  .sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at),
                  )
                  .map((s, idx) => {
                    const isPaid = s.type === "paid";
                    const other = s.otherPerson;

                    return (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: "24px",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          bgcolor: "background.paper",
                          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                          transition: "transform 0.2s",
                          "&:active": { transform: "scale(0.98)" },
                        }}
                      >
                        <Avatar
                          src={
                            other?.profile_picture
                              ? `https://prospine.in/roomOS/server/uploads/${other.profile_picture}`
                              : undefined
                          }
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: "14px",
                            bgcolor: alpha(
                              isPaid
                                ? theme.palette.success.main
                                : theme.palette.primary.main,
                              0.1,
                            ),
                            color: isPaid ? "success.main" : "primary.main",
                            fontWeight: 900,
                          }}
                        >
                          {s.otherPersonName.charAt(0)}
                        </Avatar>

                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {s.description.replace(/^\[.*?\]\s*/, "")}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: isPaid ? "success.main" : "primary.main",
                              }}
                            >
                              {isPaid ? "Paid to" : "Received from"}{" "}
                              {s.otherPersonName}
                            </Typography>
                            <DotSeparator />
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, opacity: 0.5 }}
                            >
                              {new Date(s.created_at).toLocaleDateString(
                                "en-US",
                                { day: "numeric", month: "short" },
                              )}
                            </Typography>
                          </Stack>
                        </Box>

                        <Box sx={{ textAlign: "right" }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 900,
                              color: isPaid ? "success.main" : "primary.main",
                            }}
                          >
                            {isPaid ? "-" : "+"}₹
                            {Math.round(s.amount).toLocaleString()}
                          </Typography>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              px: 1,
                              py: 0.2,
                              borderRadius: "8px",
                              bgcolor: alpha(
                                isPaid
                                  ? theme.palette.success.main
                                  : theme.palette.primary.main,
                                0.1,
                              ),
                            }}
                          >
                            {isPaid ? (
                              <ArrowUpRight size={10} weight="bold" />
                            ) : (
                              <ArrowDownLeft size={10} weight="bold" />
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.6rem",
                                fontWeight: 900,
                                textTransform: "uppercase",
                              }}
                            >
                              {isPaid ? "OUT" : "IN"}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
              </Stack>
            ) : (
              <Box sx={{ textAlign: "center", py: 10, opacity: 0.5 }}>
                <Handshake size={64} weight="duotone" />
                <Typography variant="h6" sx={{ mt: 2, fontWeight: 800 }}>
                  No Settlements Yet
                </Typography>
                <Typography variant="body2">
                  Payments made to settle dues will appear here.
                </Typography>
              </Box>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
};

const DotSeparator = () => (
  <Box
    component="span"
    sx={{
      width: 3,
      height: 3,
      borderRadius: "50%",
      bgcolor: "text.disabled",
      mx: 1,
    }}
  />
);

export default Analytics;
