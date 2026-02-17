import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Container,
  Typography,
  Card,
  Grid,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Stack,
  useTheme,
  Avatar,
  Paper,
  alpha,
  Badge,
} from "@mui/material";
import {
  Sun,
  Moon,
  Clock,
  CaretRight,
  CaretLeft,
  ArrowsClockwise,
  Bell,
  CheckCircle,
  User,
  Plus,
  Wallet,
  ChartPieSlice,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  MapPin,
  CaretDoubleDown,
} from "@phosphor-icons/react";
import api from "../api";
import useAuthStore from "../store/auth";
import useThemeStore from "../store/themeStore";
import useSettingsStore from "../store/settingsStore";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "../utils/toast";
import useSync from "../hooks/useSync";

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const { getSetting, hasMaid } = useSettingsStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [activeSessionIdx, setActiveSessionIdx] = useState(0);
  const [stackState, setStackState] = useState(0); // 0: collapsed, 1: peeking, 2: expanded
  const { refresh: refreshSync } = useSync();

  // Pull-to-refresh states
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Define handleRefresh early so it can be used in useEffects
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);

    refreshSync()
      .then(() => {
        toast.success("Dashboard updated");
      })
      .catch((error) => {
        // Only show error if it's not a cooldown rejection
        if (error?.message !== "Refresh on cooldown") {
          toast.error("Failed to refresh");
        }
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [refreshSync]);

  // Cleanup toasts on unmount
  useEffect(() => {
    return () => {
      toast.dismiss(); // Clear all toasts when leaving the page
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll lock when stack is revealed
  useEffect(() => {
    if (stackState > 0) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "auto";
      document.body.style.touchAction = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
      document.body.style.touchAction = "auto";
    };
  }, [stackState]);

  // Pull-to-refresh touch handlers
  useEffect(() => {
    let startY = 0;
    let startScrollTop = 0;
    const PULL_THRESHOLD = 80; // Lowered threshold for quicker trigger

    const handleTouchStart = (e) => {
      if (window.scrollY === 0 && stackState === 0 && !isRefreshing) {
        startY = e.touches[0].clientY;
        startScrollTop = window.scrollY;
      }
    };

    const handleTouchMove = (e) => {
      if (startY === 0 || stackState > 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0 && window.scrollY === 0) {
        setIsPulling(true);
        const resistance = 0.7; // Higher resistance = less sensitive, faster to threshold
        const distance = Math.min(diff * resistance, PULL_THRESHOLD * 1.8);
        setPullDistance(distance);

        if (diff > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (isPulling) {
        if (pullDistance >= PULL_THRESHOLD) {
          handleRefresh();
        }
        setIsPulling(false);
        setPullDistance(0);
        startY = 0;
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [stackState, isPulling, pullDistance, isRefreshing, handleRefresh]);

  const indiaTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(currentTime);

  const [dayName, dateStr, timeStr] = indiaTime.split(", ");

  const currentHour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }).format(currentTime),
    10,
  );

  const isMorning = currentHour < 16;

  // Queries

  const { data: transData, isLoading: transLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get("/transactions/list").then((res) => res || {}),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: budgetStats } = useQuery({
    queryKey: ["budget-stats"],
    queryFn: () => api.get("/budget/stats"),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  // Process any due auto-debits on dashboard load (runs once per session)
  useQuery({
    queryKey: ["autodebits-process"],
    queryFn: () => api.post("/autodebits/process"),
    staleTime: Infinity, // Never expire
    gcTime: Infinity, // Never garbage collect
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const { data: maidConfig } = useQuery({
    queryKey: ["maidConfig"],
    queryFn: () =>
      api.get("/settings/group-get?key=maid_config").then((res) => res || {}),
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const getMaidSummaryParams = () => {
    if (!maidConfig?.value) return null;
    const cfg =
      typeof maidConfig.value === "string"
        ? JSON.parse(maidConfig.value)
        : maidConfig.value;
    if (!cfg.cycleStart) return null;
    const cycleStart = new Date(cfg.cycleStart);
    const now = new Date();
    const diffDays = Math.floor((now - cycleStart) / (1000 * 60 * 60 * 24));
    const cycleOffset = Math.floor(diffDays / 30);
    const start = new Date(cycleStart);
    start.setDate(start.getDate() + cycleOffset * 30);
    const end = new Date(start);
    end.setDate(end.getDate() + 29);
    return {
      from: start.toISOString().split("T")[0],
      to: end.toISOString().split("T")[0],
      config: cfg,
    };
  };

  const maidParams = getMaidSummaryParams();

  const { data: maidAttData } = useQuery({
    queryKey: ["maidAtt", maidParams?.from, maidParams?.to],
    queryFn: () =>
      api
        .get(
          `/settings/group-get-range?key=maid_att&from=${maidParams.from}&to=${maidParams.to}`,
        )
        .then((res) => res || {}),
    enabled: !!maidParams,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api.get("/notifications").then((res) => res || {}),
    staleTime: Infinity, // Let sync handle updates
    refetchOnMount: false,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ["schedule-all"],
    queryFn: () => api.get("/schedule/get-all").then((res) => res || {}),
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const unreadCount =
    notifData?.notifications?.filter((n) => !n.is_read).length || 0;

  // ... (rest of logic remains same, just updating UI)

  const maidStats = React.useMemo(() => {
    if (!maidAttData?.entries || !maidParams) return null;
    let totalShifts = 0,
      came = 0;
    maidAttData.entries.forEach((e) => {
      const val = typeof e.value === "string" ? JSON.parse(e.value) : e.value;
      if (val.m) totalShifts++;
      if (val.e) totalShifts++;
      if (val.m || val.e) came++;
    });
    const totalSalary = maidParams.config.rate * maidParams.config.split;
    const total = Math.round(totalShifts * (totalSalary / 60));
    const perPerson = Math.round(total / (maidParams.config.split || 1));
    return { came, total, perPerson };
  }, [maidAttData, maidParams]);

  const financialStats = React.useMemo(() => {
    if (!transData) return null;

    let totalOwe = 0;
    let totalOwed = 0;
    if (transData.balances) {
      transData.balances.forEach((b) => {
        const amt = parseFloat(b.balance);
        if (amt > 0) totalOwed += amt;
        else if (amt < 0) totalOwe += Math.abs(amt);
      });
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const allTransactions = transData.transactions || [];
    const userTransactions = allTransactions.filter(
      (t) => t.user_id === user?.id,
    );

    const monthlyTransactions = userTransactions.filter((t) => {
      const date = new Date(t.created_at);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });
    const spentThisMonth = monthlyTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0,
    );

    const totalIncome = parseFloat(budgetStats?.total_income || 0);
    const incomePercent =
      totalIncome > 0 ? Math.min((spentThisMonth / totalIncome) * 100, 100) : 0;
    const netBalance = totalOwed - totalOwe;

    return {
      totalOwe,
      totalOwed,
      spentThisMonth,
      totalIncome,
      incomePercent,
      netBalance,
      recentActivity: userTransactions.slice(0, 8),
    };
  }, [transData, user?.id, budgetStats]);

  const { todaySessions, defaultLiveIdx } = React.useMemo(() => {
    if (!scheduleData?.schedule)
      return { todaySessions: [], defaultLiveIdx: -1 };

    const dayMap = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };
    const currentDayName = dayName.trim();
    const dayIdx = dayMap[currentDayName];

    const todaySchedule = scheduleData.schedule.find(
      (s) => s.day_index === dayIdx,
    );
    if (
      !todaySchedule ||
      todaySchedule.is_off ||
      !todaySchedule.classes ||
      todaySchedule.classes.length === 0
    ) {
      return { todaySessions: [], defaultLiveIdx: -1 };
    }

    const sessions = [...todaySchedule.classes].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    let liveIdx = 0;
    for (let i = 0; i < sessions.length; i++) {
      const current = sessions[i];
      const next = sessions[i + 1];
      const nextStartMinutes = next
        ? parseInt(next.startTime.split(":")[0]) * 60 +
          parseInt(next.startTime.split(":")[1])
        : null;

      const threshold = nextStartMinutes ? nextStartMinutes - 10 : 1440;

      if (nowMinutes < threshold) {
        const currentEndMinutes =
          parseInt(current.endTime.split(":")[0]) * 60 +
          parseInt(current.endTime.split(":")[1]);
        if (nowMinutes > currentEndMinutes + 30 && !next) {
          liveIdx = -1;
        } else {
          liveIdx = i;
        }
        break;
      }
      liveIdx = sessions.length - 1; // Default to last if all passed
    }

    return { todaySessions: sessions, defaultLiveIdx: liveIdx };
  }, [scheduleData, dayName, currentTime]);

  useEffect(() => {
    if (activeSessionIdx === null && defaultLiveIdx !== -1) {
      setActiveSessionIdx(defaultLiveIdx);
    }
  }, [defaultLiveIdx, activeSessionIdx]);

  const currentSession = todaySessions[activeSessionIdx ?? defaultLiveIdx];

  // Add status to current session object
  if (currentSession) {
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const start =
      parseInt(currentSession.startTime.split(":")[0]) * 60 +
      parseInt(currentSession.startTime.split(":")[1]);
    const end =
      parseInt(currentSession.endTime.split(":")[0]) * 60 +
      parseInt(currentSession.endTime.split(":")[1]);

    if (nowMinutes < start) currentSession.status = "Upcoming";
    else if (nowMinutes <= end) currentSession.status = "Ongoing";
    else currentSession.status = "Past";
  }

  if (transLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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

  const greeting = () => {
    if (currentHour < 12) return "Good Morning";
    if (currentHour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        pb: 12,
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling
          ? "background-color 0.3s ease"
          : "transform 0.3s ease, background-color 0.3s ease",
      }}
    >
      {/* Pull-to-Refresh Indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              top: -60,
              left: 0,
              right: 0,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pt: 2,
                pb: 2,
              }}
            >
              <motion.div
                animate={
                  isRefreshing
                    ? { rotate: 360 }
                    : { rotate: pullDistance * 4.5 }
                }
                transition={
                  isRefreshing
                    ? {
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }
                    : { duration: 0 }
                }
              >
                <ArrowsClockwise
                  size={32}
                  weight="bold"
                  color={theme.palette.primary.main}
                  style={{
                    opacity: Math.min(pullDistance / 80, 1),
                  }}
                />
              </motion.div>

              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  fontWeight: 700,
                  color: "text.secondary",
                  opacity: Math.min(pullDistance / 80, 1),
                }}
              >
                {isRefreshing
                  ? "Refreshing..."
                  : pullDistance >= 80
                    ? "Release to refresh"
                    : "Pull down to refresh"}
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimal Header */}
      <Box
        sx={{
          px: 3,
          pt: 6,
          pb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: "text.primary",
            letterSpacing: "-0.5px",
          }}
        >
          {greeting()},{" "}
          <Box component="span" sx={{ color: "primary.main" }}>
            {user?.name?.split(" ")[0]}
          </Box>
        </Typography>

        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={handleRefresh}
            sx={{
              bgcolor:
                mode === "light"
                  ? alpha(theme.palette.primary.main, 0.05)
                  : alpha(theme.palette.primary.main, 0.1),
              p: 1.2,
              transition: "all 0.2s",
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.15) },
            }}
          >
            <ArrowsClockwise
              size={22}
              weight="bold"
              color={theme.palette.primary.main}
            />
          </IconButton>
          <IconButton
            onClick={() => navigate("/notifications")}
            sx={{
              bgcolor:
                mode === "light"
                  ? alpha(theme.palette.primary.main, 0.05)
                  : alpha(theme.palette.primary.main, 0.1),
              p: 1.2,
              transition: "all 0.2s",
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.15) },
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{
                "& .MuiBadge-badge": {
                  fontWeight: 900,
                  fontSize: "0.65rem",
                  minWidth: "16px",
                  height: "16px",
                },
              }}
            >
              <Bell
                size={22}
                weight="duotone"
                color={theme.palette.primary.main}
              />
            </Badge>
          </IconButton>
        </Stack>
      </Box>
      <Container maxWidth="sm" sx={{ mt: 2 }}>
        {/* Vertical Wallet-style Deck (Swipe Down to Reveal) */}
        {todaySessions.length > 0 && (
          <Box
            sx={{
              position: "relative",
              height:
                stackState === 0
                  ? 170
                  : stackState === 1
                    ? 280
                    : Math.max(400, todaySessions.length * 120),
              mb: stackState === 0 ? 1 : 4,
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              justifyContent: "center",
              mt: 1,
              zIndex: stackState > 0 ? 100 : 1,
            }}
          >
            {/* Gesture Layer & Backdrop */}
            <AnimatePresence>
              {stackState > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setStackState(0)}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 80,
                    background: "rgba(0,0,0,0.3)",
                    backdropFilter: "blur(8px)",
                    touchAction: "none",
                  }}
                />
              )}
            </AnimatePresence>

            <motion.div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 300,
                cursor: "ns-resize",
                touchAction: "none",
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 80 || (offset.y > 40 && velocity.y > 400)) {
                  setStackState((prev) => Math.min(2, prev + 1));
                } else if (
                  offset.y < -80 ||
                  (offset.y < -40 && velocity.y < -400)
                ) {
                  setStackState((prev) => Math.max(0, prev - 1));
                }
              }}
            />

            {todaySessions.map((session, i) => {
              const isSelected = i === activeSessionIdx;
              const order = i - activeSessionIdx;

              // Sorting logic: Active card always on top in collapsed state,
              // In expanded state, they are in natural order and sit ABOVE gesture layer.
              let zIndex = 100 - Math.abs(order);
              if (stackState === 1) zIndex = 350 + i;
              if (stackState === 2) zIndex = 400 + i;

              const nowMinutes =
                currentTime.getHours() * 60 + currentTime.getMinutes();
              const start =
                parseInt(session.startTime.split(":")[0]) * 60 +
                parseInt(session.startTime.split(":")[1]);
              const end =
                parseInt(session.endTime.split(":")[0]) * 60 +
                parseInt(session.endTime.split(":")[1]);
              let status = "Upcoming";
              if (nowMinutes >= start && nowMinutes <= end) status = "Ongoing";
              else if (nowMinutes > end) status = "Past";

              // Position calculations
              let yPos = 0;
              let scale = 1;
              let opacity = 1;

              if (stackState === 0) {
                // Collapsed: Stacked behind active
                if (i === activeSessionIdx) {
                  yPos = 0;
                  scale = 1;
                  opacity = 1;
                } else if (i > activeSessionIdx) {
                  const diff = i - activeSessionIdx;
                  yPos = diff * -8;
                  scale = 1 - diff * 0.035;
                  opacity = diff > 2 ? 0 : 1;
                } else {
                  yPos = 0;
                  scale = 0.9;
                  opacity = 0;
                }
              } else if (stackState === 1) {
                // Peeking: Cards fan out slightly
                yPos = i * 40;
                scale = 1 - Math.abs(i - activeSessionIdx) * 0.02;
                opacity = 1;
              } else {
                // Expanded: High contrast list
                yPos = i * 110;
                scale = isSelected ? 1.02 : 1;
                opacity = 1;
              }

              return (
                <motion.div
                  key={i}
                  style={{
                    position: "absolute",
                    width: "100%",
                    zIndex: zIndex,
                    cursor: stackState === 2 ? "pointer" : "default",
                    touchAction: "none",
                  }}
                  drag={stackState > 0 ? "y" : false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.1}
                  onDragEnd={(e, { offset, velocity }) => {
                    if (stackState > 0) {
                      if (
                        offset.y > 80 ||
                        (offset.y > 40 && velocity.y > 400)
                      ) {
                        setStackState((prev) => Math.min(2, prev + 1));
                      } else if (
                        offset.y < -80 ||
                        (offset.y < -40 && velocity.y < -400)
                      ) {
                        setStackState((prev) => Math.max(0, prev - 1));
                      }
                    }
                  }}
                  animate={{
                    y: yPos,
                    scale: scale,
                    opacity: opacity,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 28,
                    mass: 0.8,
                  }}
                  onClick={() => {
                    if (stackState === 2) {
                      setActiveSessionIdx(i);
                      setStackState(0);
                    }
                  }}
                >
                  <Card
                    sx={{
                      p: stackState === 2 ? 2 : 3,
                      borderRadius: "28px",
                      background:
                        theme.palette.mode === "light"
                          ? status === "Ongoing"
                            ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                            : isSelected
                              ? "#222"
                              : "#333"
                          : status === "Ongoing"
                            ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${alpha(theme.palette.primary.main, 0.4)} 100%)`
                            : isSelected
                              ? "#1a1a1a"
                              : alpha(theme.palette.background.paper, 0.9),
                      color: "white",
                      boxShadow:
                        isSelected || stackState === 2
                          ? "0 12px 30px rgba(0,0,0,0.3)"
                          : "none",
                      border: `1px solid ${alpha("#fff", 0.1)}`,
                      position: "relative",
                      overflow: "hidden",
                      height: 160,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -10,
                        right: -10,
                        opacity: 0.08,
                      }}
                    >
                      <BookOpen size={100} weight="duotone" />
                    </Box>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          opacity: 0.7,
                        }}
                      >
                        {status} • {session.startTime}
                      </Typography>
                      {isSelected && stackState === 0 && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            bgcolor: "primary.light",
                            borderRadius: "50%",
                          }}
                        />
                      )}
                    </Stack>

                    <Typography
                      variant={stackState === 2 ? "h6" : "h5"}
                      sx={{ fontWeight: 900, mb: 1, letterSpacing: "-0.5px" }}
                    >
                      {session.subject}
                    </Typography>

                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.8 }}
                      >
                        <MapPin size={18} weight="fill" />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, opacity: 0.8 }}
                        >
                          {session.room || "No Room"}
                        </Typography>
                      </Box>

                      {status === "Ongoing" && (
                        <Box
                          sx={{
                            flex: 1,
                            height: 4,
                            bgcolor: "rgba(255,255,255,0.1)",
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          {(() => {
                            const curr =
                              currentTime.getHours() * 60 +
                              currentTime.getMinutes();
                            const prog = Math.min(
                              100,
                              Math.max(
                                0,
                                ((curr - start) / (end - start)) * 100,
                              ),
                            );
                            return (
                              <Box
                                sx={{
                                  width: `${prog}%`,
                                  height: 1,
                                  bgcolor: "white",
                                }}
                              />
                            );
                          })()}
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </motion.div>
              );
            })}
          </Box>
        )}

        {/* Animated Swipe Hint - Only show if schedule exists */}
        {stackState === 0 && todaySessions.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                opacity: 0.4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <CaretDoubleDown size={20} weight="bold" />
            </motion.div>
          </Box>
        )}

        {/* FINTECH MODE: M3 Redesign */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Elevated Spotlight Card */}
          {(() => {
            const pct = financialStats?.incomePercent || 0;
            // Tier-based color & messaging system
            const getTier = (p) => {
              if (p >= 90)
                return {
                  color: mode === "light" ? "#b71c1c" : "#ffb4ab",
                  bgTint: "rgba(183, 28, 28, 0.08)",
                  barColor: "#c62828",
                  chipBg: mode === "light" ? "#ffcdd2" : alpha("#b71c1c", 0.15),
                  chipColor: mode === "light" ? "#b71c1c" : "#ffb4ab",
                  label: "💀 You're cooked",
                  message: "You are fucked this month 😭",
                };
              if (p >= 60)
                return {
                  color: mode === "light" ? "#d32f2f" : "#ffb4ab",
                  bgTint: "rgba(211, 47, 47, 0.06)",
                  barColor: "#e53935",
                  chipBg: mode === "light" ? "#ffcdd2" : alpha("#c62828", 0.15),
                  chipColor: mode === "light" ? "#c62828" : "#ffb4ab",
                  label: "⚠️ Danger Zone",
                  message: "Shit's going down from here on 📉",
                };
              if (p >= 30)
                return {
                  color: mode === "light" ? "#ef6c00" : "#ffcc80",
                  bgTint: "rgba(239, 108, 0, 0.05)",
                  barColor: "#f57c00",
                  chipBg: mode === "light" ? "#fff3e0" : alpha("#e65100", 0.15),
                  chipColor: mode === "light" ? "#e65100" : "#ffcc80",
                  label: "😬 Watch Out",
                  message: "Shit gets real from here... 👀",
                };
              return {
                color: mode === "light" ? "#2e7d32" : "#b4e4b8",
                bgTint: "transparent",
                barColor: theme.palette.primary.main,
                chipBg: mode === "light" ? "#e8f5e9" : alpha("#2e7d32", 0.15),
                chipColor: mode === "light" ? "#2e7d32" : "#b4e4b8",
                label: "✅ On Track",
                message: `₹${Math.round((financialStats?.totalIncome || 0) - (financialStats?.spentThisMonth || 0))} remaining for this month`,
              };
            };
            const tier = getTier(pct);

            return (
              <Card
                sx={{
                  p: 3,
                  borderRadius: "28px",
                  bgcolor: mode === "light" ? "#fff" : "background.paper",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  mb: 3,
                  position: "relative",
                  overflow: "hidden",
                  border:
                    mode === "light"
                      ? "1px solid rgba(0,0,0,0.05)"
                      : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Box sx={{ position: "relative", zIndex: 1 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        fontWeight: 700,
                        color: "text.secondary",
                        letterSpacing: "1px",
                      }}
                    >
                      Monthly Expenditure
                    </Typography>
                    <Chip
                      label={tier.label}
                      size="small"
                      sx={{
                        bgcolor: tier.chipBg,
                        color: tier.chipColor,
                        fontWeight: 800,
                        height: 26,
                        fontSize: "0.65rem",
                        border: `1px solid ${alpha(tier.chipColor, 0.2)}`,
                      }}
                    />
                  </Stack>
                  <Stack
                    direction="row"
                    alignItems="baseline"
                    spacing={1}
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 800,
                        fontSize: "3rem",
                        letterSpacing: "-2px",
                        color: tier.color,
                        transition: "color 0.5s ease",
                      }}
                    >
                      ₹{Math.round(financialStats?.spentThisMonth || 0)}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ color: "text.secondary", fontWeight: 600 }}
                    >
                      / ₹{Math.round(financialStats?.totalIncome || 0)}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      color: pct >= 30 ? tier.color : "text.secondary",
                      fontWeight: pct >= 60 ? 700 : 500,
                      mb: 3,
                      transition: "all 0.3s ease",
                    }}
                  >
                    {tier.message}
                  </Typography>

                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, color: "text.secondary" }}
                      >
                        Spending vs Income
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: tier.color,
                          transition: "color 0.5s ease",
                        }}
                      >
                        {Math.round(pct)}%
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        height: 8,
                        bgcolor: "action.hover",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{
                          height: "100%",
                          backgroundColor: tier.barColor,
                          borderRadius: 4,
                          transition: "background-color 0.5s ease",
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Card>
            );
          })()}

          {/* M3 Filled Cards Grid - Strict 2x2 */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
              {
                label: "My Spent",
                value: financialStats?.spentThisMonth,
                color: "primary",
                icon: <ArrowUpRight />,
              },
              {
                label: "You Owe",
                value: financialStats?.totalOwe,
                color: "error",
                icon: <ArrowDownLeft />,
              },
              {
                label: "Owed to You",
                value: financialStats?.totalOwed,
                color: "success",
                icon: <ArrowUpRight />,
              },
              {
                label: "Maid Share",
                value: maidStats?.perPerson,
                color: "secondary",
                icon: <User />,
              },
            ].map((item, i) => (
              <Grid size={6} key={i}>
                <Card
                  variant="filled"
                  sx={{
                    p: 2.5,
                    borderRadius: "24px",
                    bgcolor: `${item.color}.container`,
                    color: `${item.color}.onContainer`,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    border:
                      mode === "light"
                        ? "1px solid rgba(0,0,0,0.02)"
                        : "1px solid rgba(255,255,255,0.05)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: "background.paper",
                      p: 1,
                      borderRadius: "12px",
                      color: `${item.color}.main`,
                      display: "flex",
                      width: "fit-content",
                      boxShadow:
                        mode === "light"
                          ? "0 2px 8px rgba(0,0,0,0.03)"
                          : "0 4px 12px rgba(0,0,0,0.2)",
                    }}
                  >
                    {React.cloneElement(item.icon, {
                      size: 20,
                      weight: "duotone",
                    })}
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        opacity: 0.7,
                        display: "block",
                        mb: 0.5,
                        letterSpacing: "0.5px",
                        fontSize: "0.65rem",
                      }}
                    >
                      {item.label.toUpperCase()}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
                    >
                      ₹{Math.round(item.value)}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ px: 1 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2.5 }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, letterSpacing: "-0.5px" }}
              >
                Recent Activity
              </Typography>
              <Button
                size="small"
                onClick={() => navigate("/transactions")}
                sx={{
                  borderRadius: "20px",
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                View History
              </Button>
            </Stack>

            <Stack spacing={1.5}>
              {financialStats?.recentActivity?.map((t, idx) => (
                <Card
                  key={idx}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor:
                        t.user_id === user?.id
                          ? "primary.container"
                          : mode === "light"
                            ? "#f0f0f0"
                            : "rgba(255,255,255,0.05)",
                      color:
                        t.user_id === user?.id
                          ? "primary.onContainer"
                          : "text.primary",
                    }}
                  >
                    <Wallet weight="duotone" />
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 700, fontSize: "0.95rem" }}
                    >
                      {t.description || "General Expense"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 600 }}
                    >
                      {t.user_id === user?.id ? "You" : t.user_name} •{" "}
                      {new Date(t.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 800,
                        color:
                          t.user_id === user?.id
                            ? "error.main"
                            : "success.main",
                      }}
                    >
                      {t.user_id === user?.id ? "-" : "+"}₹
                      {Math.round(t.amount)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 700 }}
                    >
                      {t.category || "Shared"}
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Stack>
          </Box>
        </motion.div>
      </Container>

      {/* M3 Floating Action Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: 50 }}
        style={{ position: "fixed", bottom: 90, right: 24, zIndex: 1000 }}
      >
        <Button
          variant="contained"
          onClick={() =>
            navigate("/transactions", { state: { openAddModal: true } })
          }
          sx={{
            py: 1.5,
            px: 2,
            borderRadius: "24px",
            fontWeight: 800,
            boxShadow:
              mode === "light"
                ? "0 8px 24px rgba(0,0,0,0.15)"
                : "0 12px 32px rgba(0,0,0,0.4)",
            textTransform: "none",
            fontSize: "0.7rem",
            display: "flex",
            gap: 1.5,
            bgcolor: "primary.main",
            color: mode === "light" ? "white" : "#041e49",
            "&:hover": {
              bgcolor: mode === "light" ? "primary.dark" : "#d3e3fd",
              boxShadow:
                mode === "light"
                  ? "0 12px 30px rgba(0,0,0,0.2)"
                  : "0 16px 40px rgba(0,0,0,0.5)",
              transform: "translateY(-2px)",
            },
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Plus size={20} weight="bold" />
          <Typography variant="button" sx={{ fontWeight: 800 }}>
            Add Expense
          </Typography>
        </Button>
      </motion.div>
    </Box>
  );
};

export default Dashboard;
