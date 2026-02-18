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
  Collapse,
  LinearProgress,
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
  CaretDown,
  Receipt,
  Handshake,
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
  const [activeSessionIdx, setActiveSessionIdx] = useState(null);
  const [stackState, setStackState] = useState(0); // 0: collapsed, 1: peeking, 2: expanded
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);
  const [isSpentExpanded, setIsSpentExpanded] = useState(false);
  const [isMaidExpanded, setIsMaidExpanded] = useState(false);
  const [poppedIdx, setPoppedIdx] = useState(null);
  const { refresh: refreshSync } = useSync();

  // Define handleRefresh early so it can be used in useEffects
  const handleRefresh = useCallback(() => {
    refreshSync()
      .then(() => {
        toast.success("Dashboard updated");
      })
      .catch((error) => {
        // Only show error if it's not a cooldown rejection
        if (error?.message !== "Refresh on cooldown") {
          toast.error("Failed to refresh");
        }
      });
  }, [refreshSync]);

  // Force scroll to top on mount (fixes issue where navigating back scrolls to bottom)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
      setPoppedIdx(null); // Reset pop when collapsing
    }
    return () => {
      document.body.style.overflow = "auto";
      document.body.style.touchAction = "auto";
    };
  }, [stackState]);

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
      totalIncome > 0 ? (spentThisMonth / totalIncome) * 100 : 0;
    const netBalance = totalOwed - totalOwe;

    // Calculate Personal vs Shared for this month
    const sharedSpent = monthlyTransactions
      .filter((t) => {
        try {
          const split = t.split_between ? JSON.parse(t.split_between) : [];
          return split.length > 1;
        } catch (e) {
          return false;
        }
      })
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const personalSpent = spentThisMonth - sharedSpent;

    // Daily flow for current month
    const dailySpending = {};
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dailySpending[i] = 0;
    }

    // Category Split for this month
    const categoryDistribution = {};
    monthlyTransactions.forEach((t) => {
      const match = t.description?.match(/^\[(.*?)\]/);
      const cat = match ? match[1] : "other";
      categoryDistribution[cat] =
        (categoryDistribution[cat] || 0) + parseFloat(t.amount);

      const day = new Date(t.created_at).getDate();
      dailySpending[day] += parseFloat(t.amount);
    });

    return {
      totalOwe,
      totalOwed,
      spentThisMonth,
      totalIncome,
      incomePercent,
      netBalance,
      sharedSpent,
      personalSpent,
      categoryDistribution,
      dailySpending: Object.values(dailySpending),
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
      b.startTime.localeCompare(a.startTime),
    );
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    let ongoingIdx = -1;
    let bufferIdx = -1;
    let latestPastIdx = -1;
    let earliestUpcomingIdx = -1;

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const sStart =
        parseInt(s.startTime.split(":")[0]) * 60 +
        parseInt(s.startTime.split(":")[1]);
      const sEnd =
        parseInt(s.endTime.split(":")[0]) * 60 +
        parseInt(s.endTime.split(":")[1]);

      if (nowMinutes >= sStart && nowMinutes <= sEnd) {
        ongoingIdx = i;
      } else if (nowMinutes < sStart) {
        if (sStart - nowMinutes <= 10) {
          if (bufferIdx === -1) bufferIdx = i;
          else {
            const currentSelectedStart =
              parseInt(sessions[bufferIdx].startTime.split(":")[0]) * 60 +
              parseInt(sessions[bufferIdx].startTime.split(":")[1]);
            if (sStart < currentSelectedStart) bufferIdx = i;
          }
        }
        earliestUpcomingIdx = i;
      } else if (nowMinutes > sEnd) {
        if (latestPastIdx === -1) latestPastIdx = i;
      }
    }

    let liveIdx = -1;
    if (ongoingIdx !== -1) liveIdx = ongoingIdx;
    else if (bufferIdx !== -1) liveIdx = bufferIdx;
    else if (latestPastIdx !== -1) liveIdx = latestPastIdx;
    else if (earliestUpcomingIdx !== -1) liveIdx = earliestUpcomingIdx;
    else liveIdx = 0;

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
      }}
    >
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
          <motion.div
            initial={false}
            animate={{
              height:
                stackState === 0
                  ? 170
                  : Math.max(400, todaySessions.length * 110),
              marginTop: stackState > 0 ? -90 : 48,
              marginBottom: stackState === 0 ? 8 : 32,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 32,
              mass: 0.8,
            }}
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
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

            {/* Main Interactive Stack Layer */}
            <motion.div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 300,
                touchAction: "none",
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 60 || (offset.y > 30 && velocity.y > 300)) {
                  setStackState(2);
                } else if (
                  offset.y < -60 ||
                  (offset.y < -30 && velocity.y < -300)
                ) {
                  setStackState(0);
                }
              }}
            >
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
                if (nowMinutes >= start && nowMinutes <= end)
                  status = "Ongoing";
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
                  } else if (i < activeSessionIdx) {
                    // In descending list, smaller indices are LATER in the day (Upcoming)
                    const diff = activeSessionIdx - i;
                    yPos = diff * -8;
                    scale = 1;
                    opacity = 1;
                  } else {
                    // Larger indices are EARLIER in the day (Past)
                    // Hide them behind the active one
                    yPos = 0;
                    scale = 0.95;
                    opacity = 0;
                  }
                } else {
                  // Expanded: High contrast list
                  yPos = i * 110;
                  if (poppedIdx === i) {
                    yPos -= 20; // Move up a little
                    scale = 1.05; // Pop out a little
                  } else if (poppedIdx !== null) {
                    // If another card is popped, move others slightly away or just leave them
                    if (i > poppedIdx) yPos += 20;
                  } else {
                    scale = isSelected ? 1.02 : 1;
                  }
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
                    animate={{
                      y: yPos,
                      scale: scale,
                      opacity: opacity,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 1,
                    }}
                    onTap={() => {
                      if (stackState === 2) {
                        if (poppedIdx === i) {
                          setActiveSessionIdx(i);
                          setStackState(0);
                        } else {
                          setPoppedIdx(i);
                        }
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
                              : status === "Upcoming" && isSelected
                                ? `linear-gradient(135deg, #2c3e50 0%, #000000 100%)` // Premium Obsidian for Upcoming
                                : isSelected
                                  ? "#1a1a1a"
                                  : "#252525"
                            : status === "Ongoing"
                              ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
                              : status === "Upcoming" && isSelected
                                ? `linear-gradient(135deg, #121212 0%, #1a1a1a 100%)`
                                : isSelected
                                  ? "#0f0f0f"
                                  : "#141414",
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
                          {status} •{" "}
                          {(() => {
                            const formatTime = (timeStr) => {
                              const [h, m] = timeStr.split(":");
                              const date = new Date();
                              date.setHours(parseInt(h), parseInt(m));
                              return date
                                .toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                                .replace(" ", "")
                                .toLowerCase();
                            };
                            return `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`;
                          })()}
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
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.8,
                          }}
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
            </motion.div>
          </motion.div>
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
                onClick={() => setIsHeroExpanded(!isHeroExpanded)}
                sx={{
                  p: 3,
                  borderRadius: "28px",
                  bgcolor: mode === "light" ? "#fff" : "background.paper",
                  boxShadow: isHeroExpanded
                    ? "0 20px 40px rgba(0,0,0,0.1)"
                    : "0 4px 12px rgba(0,0,0,0.05)",
                  mb: 3,
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                  border:
                    mode === "light"
                      ? "1px solid rgba(0,0,0,0.05)"
                      : "1px solid rgba(255,255,255,0.05)",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: isHeroExpanded ? "none" : "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
                  },
                }}
              >
                {/* Background Pattern - subtle when expanded */}
                <Box
                  sx={{
                    position: "absolute",
                    top: -100,
                    right: -100,
                    width: isHeroExpanded ? 400 : 200,
                    height: isHeroExpanded ? 400 : 200,
                    borderRadius: "50%",
                    background: alpha(tier.barColor, 0.03),
                    filter: "blur(60px)",
                    transition: "all 0.6s ease",
                  }}
                />

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
                      {new Date().toLocaleString("default", { month: "long" })}{" "}
                      Outflow
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
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
                      <Box
                        sx={{
                          transform: isHeroExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.4s ease",
                          display: "flex",
                          color: "text.disabled",
                        }}
                      >
                        <CaretDown size={18} weight="bold" />
                      </Box>
                    </Stack>
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
                        fontSize: isHeroExpanded ? "3.5rem" : "3rem",
                        letterSpacing: "-2px",
                        color: tier.color,
                        transition: "all 0.4s ease",
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
                      mb: isHeroExpanded ? 4 : 3,
                      transition: "all 0.3s ease",
                    }}
                  >
                    {tier.message}
                  </Typography>

                  {/* Expanded Analytics Section */}
                  <Collapse in={isHeroExpanded} timeout={600}>
                    <Box sx={{ mb: 4 }}>
                      {/* Detailed Budget Utilization */}
                      <Box
                        sx={{
                          bgcolor: alpha(tier.barColor, 0.05),
                          p: 2.5,
                          borderRadius: "24px",
                          border: `1px solid ${alpha(tier.barColor, 0.1)}`,
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 800, color: tier.color }}
                          >
                            BUDGET UTILIZATION
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 900, color: tier.color }}
                          >
                            {Math.round(pct)}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, pct)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(tier.barColor, 0.1),
                            "& .MuiLinearProgress-bar": {
                              bgcolor: tier.barColor,
                              borderRadius: 3,
                            },
                          }}
                        />
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mt: 1.5 }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.secondary",
                                fontWeight: 600,
                                display: "block",
                              }}
                            >
                              AVAILABLE
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 800 }}
                            >
                              ₹
                              {Math.max(
                                0,
                                financialStats?.totalIncome -
                                  financialStats?.spentThisMonth,
                              ).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.secondary",
                                fontWeight: 600,
                                display: "block",
                              }}
                            >
                              LIMIT
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 800 }}
                            >
                              ₹
                              {Math.round(
                                financialStats?.totalIncome || 0,
                              ).toLocaleString()}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Box>
                  </Collapse>

                  {/* Standard Progress (Hidden when expanded to reduce clutter) */}
                  {!isHeroExpanded && (
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
                  )}
                </Box>
              </Card>
            );
          })()}

          {/* M3 Filled Cards Grid - Smart Layout */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
              {
                label: "My Spent",
                value: financialStats?.spentThisMonth,
                color: "primary",
                icon: <ArrowUpRight />,
                path: "/analytics",
                size: isSpentExpanded ? 12 : hasMaid() ? 6 : 12,
              },
              ...(hasMaid()
                ? [
                    {
                      label: "Maid Share",
                      value: maidStats?.perPerson,
                      color: "secondary",
                      icon: <User />,
                      path: "/settings/maid-attendance",
                      size: isMaidExpanded ? 12 : isSpentExpanded ? 12 : 6,
                    },
                  ]
                : []),
              {
                label: "Settlements",
                owe: financialStats?.totalOwe,
                owed: financialStats?.totalOwed,
                color: "grey",
                icon: <Handshake />,
                path: "/transactions",
                size: 12,
              },
            ].map((item, i) => (
              <Grid size={item.size} key={i}>
                <Card
                  variant="filled"
                  onClick={() => {
                    if (item.label === "My Spent") {
                      setIsSpentExpanded(!isSpentExpanded);
                    } else if (item.label === "Maid Share") {
                      setIsMaidExpanded(!isMaidExpanded);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  sx={{
                    p: 2.5,
                    borderRadius: "28px",
                    bgcolor:
                      item.label === "Settlements"
                        ? mode === "light"
                          ? "#f5f5f7"
                          : alpha(theme.palette.background.paper, 0.4)
                        : mode === "light"
                          ? item.color === "primary"
                            ? "#004fcb"
                            : item.color === "secondary"
                              ? "#006684"
                              : `${item.color}.main`
                          : `${item.color}.container`,
                    color:
                      item.label === "Settlements"
                        ? "text.primary"
                        : mode === "light"
                          ? "#fff"
                          : `${item.color}.onContainer`,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:active": { transform: "scale(0.96)" },
                    "&:hover": {
                      bgcolor:
                        mode === "light"
                          ? item.color === "primary"
                            ? "#003ea1"
                            : item.color === "secondary"
                              ? "#004e66"
                              : `${item.color}.dark`
                          : `${item.color}.main`,
                      color: "white",
                      "& .item-icon-box": {
                        bgcolor: "rgba(255,255,255,0.2)",
                        color: "white",
                      },
                      "& .item-action-btn": {
                        opacity: 1,
                        transform: "translateX(0)",
                      },
                    },
                    position: "relative",
                    overflow: "hidden",
                    boxShadow:
                      (item.label === "My Spent" && isSpentExpanded) ||
                      (item.label === "Maid Share" && isMaidExpanded)
                        ? `0 24px 48px ${alpha(mode === "light" ? "#000" : theme.palette[item.color].main, mode === "light" ? 0.2 : 0.3)}`
                        : "none",
                    border:
                      item.label === "Settlements" && mode === "light"
                        ? "1px solid rgba(0,0,0,0.05)"
                        : "none",
                  }}
                >
                  {(item.label === "My Spent" ||
                    item.label === "Maid Share" ||
                    item.label === "Settlements") && (
                    <IconButton
                      size="small"
                      className="item-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(item.path);
                      }}
                      sx={{
                        position: "absolute",
                        top: 20,
                        right: 20,
                        bgcolor: alpha("#fff", 0.1),
                        color: "inherit",
                        opacity:
                          (item.label === "My Spent" && isSpentExpanded) ||
                          (item.label === "Maid Share" && isMaidExpanded) ||
                          item.label === "Settlements"
                            ? 1
                            : 0,
                        transform:
                          (item.label === "My Spent" && isSpentExpanded) ||
                          (item.label === "Maid Share" && isMaidExpanded) ||
                          item.label === "Settlements"
                            ? "translateX(0)"
                            : "translateX(10px)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <ArrowUpRight size={18} />
                    </IconButton>
                  )}

                  <Box
                    className="item-icon-box"
                    sx={{
                      bgcolor: "background.paper",
                      p: 1,
                      borderRadius: "12px",
                      color:
                        item.label === "Settlements"
                          ? "grey.500"
                          : `${item.color}.main`,
                      display: "flex",
                      width: "fit-content",
                      transition: "all 0.2s ease",
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
                  <Box sx={{ flex: 1 }}>
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
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
                      >
                        {item.label === "Settlements"
                          ? `₹${Math.round((item.owed || 0) - (item.owe || 0))}`
                          : `₹${Math.round(item.value)}`}
                      </Typography>
                      {(item.label === "My Spent" ||
                        item.label === "Maid Share") && (
                        <Box
                          sx={{
                            transform:
                              (item.label === "My Spent" && isSpentExpanded) ||
                              (item.label === "Maid Share" && isMaidExpanded)
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                            transition: "transform 0.4s ease",
                            display: "flex",
                            opacity: 0.5,
                          }}
                        >
                          <CaretDown size={14} weight="bold" />
                        </Box>
                      )}
                    </Stack>

                    {item.label === "Settlements" && (
                      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                        <Box
                          sx={{
                            flex: 1,
                            p: 1.5,
                            borderRadius: "16px",
                            bgcolor:
                              mode === "light"
                                ? alpha(theme.palette.error.main, 0.08)
                                : alpha(theme.palette.error.main, 0.12),
                            color:
                              mode === "light"
                                ? theme.palette.error.dark
                                : theme.palette.error.light,
                            border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              opacity: 0.6,
                              fontSize: "0.6rem",
                              display: "block",
                              mb: 0.5,
                            }}
                          >
                            YOU OWE
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 900 }}>
                            ₹{Math.round(item.owe || 0)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            p: 1.5,
                            borderRadius: "16px",
                            bgcolor:
                              mode === "light"
                                ? alpha(theme.palette.success.main, 0.08)
                                : alpha(theme.palette.success.main, 0.12),
                            color:
                              mode === "light"
                                ? theme.palette.success.dark
                                : theme.palette.success.light,
                            border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              opacity: 0.6,
                              fontSize: "0.6rem",
                              display: "block",
                              mb: 0.5,
                            }}
                          >
                            OWED TO YOU
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 900 }}>
                            ₹{Math.round(item.owed || 0)}
                          </Typography>
                        </Box>
                      </Stack>
                    )}

                    {item.label === "My Spent" && (
                      <Collapse in={isSpentExpanded} timeout={500}>
                        <Box sx={{ mt: 3 }}>
                          {/* Expense Flow Graph */}
                          <Box sx={{ mb: 4, px: 0.5 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 800,
                                opacity: 0.6,
                                letterSpacing: "0.5px",
                                display: "block",
                                mb: 2,
                              }}
                            >
                              EXPENSE FLOW
                            </Typography>
                            <Stack
                              direction="row"
                              alignItems="flex-end"
                              spacing={0.5}
                              sx={{
                                height: 80,
                                mb: 1,
                                display: "flex",
                                alignItems: "flex-end",
                              }}
                            >
                              {financialStats?.dailySpending?.map((val, d) => {
                                const maxVal =
                                  Math.max(...financialStats.dailySpending) ||
                                  1;
                                const height = (val / maxVal) * 100;
                                return (
                                  <motion.div
                                    key={d}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{
                                      height: `${Math.max(height, 5)}%`,
                                      opacity: 1,
                                    }}
                                    transition={{
                                      delay: d * 0.02,
                                      duration: 0.5,
                                    }}
                                    style={{
                                      flex: 1,
                                      backgroundColor:
                                        val > 0
                                          ? "rgba(255,255,255,0.6)"
                                          : "rgba(255,255,255,0.15)",
                                      borderRadius: "2px 2px 0 0",
                                    }}
                                  />
                                );
                              })}
                            </Stack>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                opacity: 0.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.5rem" }}
                              >
                                Day 1
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.5rem" }}
                              >
                                Day {financialStats?.dailySpending?.length}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Split Summary */}
                          <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                            <Box
                              sx={{
                                flex: 1,
                                p: 1.5,
                                borderRadius: "16px",
                                bgcolor: "rgba(255,255,255,0.05)",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  opacity: 0.7,
                                  fontSize: "0.6rem",
                                  display: "block",
                                  mb: 0.5,
                                }}
                              >
                                SHARED
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 800 }}
                              >
                                ₹{Math.round(financialStats?.sharedSpent)}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                flex: 1,
                                p: 1.5,
                                borderRadius: "16px",
                                bgcolor: "rgba(255,255,255,0.05)",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  opacity: 0.7,
                                  fontSize: "0.6rem",
                                  display: "block",
                                  mb: 0.5,
                                }}
                              >
                                PERSONAL
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 800 }}
                              >
                                ₹{Math.round(financialStats?.personalSpent)}
                              </Typography>
                            </Box>
                          </Stack>

                          {/* Mini Category Distribution */}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              opacity: 0.6,
                              letterSpacing: "0.5px",
                              display: "block",
                              mb: 1.5,
                            }}
                          >
                            TOP CATEGORIES
                          </Typography>
                          <Stack spacing={1.5}>
                            {Object.entries(
                              financialStats?.categoryDistribution || {},
                            )
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 3)
                              .map(([cat, val]) => (
                                <Box key={cat}>
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    sx={{ mb: 0.5 }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: "0.65rem",
                                      }}
                                    >
                                      {cat.toUpperCase()}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 800,
                                        fontSize: "0.65rem",
                                      }}
                                    >
                                      {Math.round(
                                        (val / (item.value || 1)) * 100,
                                      )}
                                      %
                                    </Typography>
                                  </Stack>
                                  <LinearProgress
                                    variant="determinate"
                                    value={(val / (item.value || 1)) * 100}
                                    sx={{
                                      height: 4,
                                      borderRadius: 2,
                                      bgcolor: alpha("#000", 0.05),
                                      "& .MuiLinearProgress-bar": {
                                        borderRadius: 2,
                                        bgcolor: "currentColor",
                                      },
                                    }}
                                  />
                                </Box>
                              ))}
                          </Stack>
                        </Box>
                      </Collapse>
                    )}
                    {item.label === "Maid Share" && (
                      <Collapse in={isMaidExpanded} timeout={500}>
                        <Box sx={{ mt: 3 }}>
                          {/* Attendance Stats */}
                          <Box sx={{ mb: 4 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 800,
                                opacity: 0.6,
                                letterSpacing: "0.5px",
                                display: "block",
                                mb: 2,
                              }}
                            >
                              ATTENDANCE SUMMARY
                            </Typography>
                            <Stack direction="row" spacing={2}>
                              <Box
                                sx={{
                                  flex: 1,
                                  p: 2,
                                  borderRadius: "20px",
                                  bgcolor: "rgba(255,255,255,0.05)",
                                  textAlign: "center",
                                }}
                              >
                                <CheckCircle
                                  size={24}
                                  weight="duotone"
                                  style={{ marginBottom: 8, opacity: 0.8 }}
                                />
                                <Typography
                                  variant="h5"
                                  sx={{ fontWeight: 800 }}
                                >
                                  {maidStats?.came}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ opacity: 0.6, fontWeight: 700 }}
                                >
                                  DAYS PRESENT
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  flex: 1,
                                  p: 2,
                                  borderRadius: "20px",
                                  bgcolor: "rgba(255,255,255,0.05)",
                                  textAlign: "center",
                                }}
                              >
                                <Clock
                                  size={24}
                                  weight="duotone"
                                  style={{ marginBottom: 8, opacity: 0.8 }}
                                />
                                <Typography
                                  variant="h5"
                                  sx={{ fontWeight: 800 }}
                                >
                                  {maidParams?.config?.rate}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ opacity: 0.6, fontWeight: 700 }}
                                >
                                  MONTHLY RATE
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>

                          {/* Salary Split Info */}
                          <Box
                            sx={{
                              p: 2.5,
                              borderRadius: "20px",
                              bgcolor: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 800,
                                    opacity: 0.6,
                                    display: "block",
                                  }}
                                >
                                  SPLIT BETWEEN
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{ fontWeight: 800 }}
                                >
                                  {maidParams?.config?.split} members
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: "right" }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 800,
                                    opacity: 0.6,
                                    display: "block",
                                  }}
                                >
                                  YOUR SHARE
                                </Typography>
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: 900 }}
                                >
                                  ₹{item.value}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Box>
                      </Collapse>
                    )}
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
              sx={{ mb: 3 }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
                >
                  Recent Activity
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  Your latest financial movements
                </Typography>
              </Box>
              <Button
                variant="soft"
                size="small"
                onClick={() => navigate("/transactions")}
                sx={{
                  borderRadius: "14px",
                  textTransform: "none",
                  fontWeight: 800,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                  px: 2,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                  },
                }}
              >
                View History
              </Button>
            </Stack>

            <Stack spacing={1.5}>
              {financialStats?.recentActivity?.map((t, idx) => {
                const isMyExpense = t.user_id === user?.id;
                let split = [];
                try {
                  split =
                    typeof t.split_between === "string"
                      ? JSON.parse(t.split_between)
                      : t.split_between || [];
                } catch (e) {}

                const isSettlement =
                  t.category === "settle" ||
                  t.description?.toLowerCase().includes("settle");
                const isPersonal =
                  !isSettlement &&
                  split.length === 1 &&
                  parseInt(split[0]) === parseInt(t.user_id);
                const isShared = !isSettlement && !isPersonal;

                let tag = "Shared";
                let tagColor = theme.palette.primary.main;
                if (isSettlement) {
                  tag = "Settlement";
                  tagColor = theme.palette.success.main;
                } else if (isPersonal) {
                  tag = "Personal";
                  tagColor = theme.palette.info.main;
                }

                return (
                  <Card
                    key={idx}
                    elevation={0}
                    onClick={() =>
                      navigate("/transactions", {
                        state: { transactionId: t.id },
                      })
                    }
                    sx={{
                      p: 2,
                      borderRadius: "24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      bgcolor:
                        mode === "light"
                          ? "background.paper"
                          : alpha(theme.palette.background.paper, 0.4),
                      border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        bgcolor:
                          mode === "light"
                            ? alpha(theme.palette.primary.main, 0.02)
                            : alpha(theme.palette.primary.main, 0.05),
                        borderColor: alpha(theme.palette.primary.main, 0.1),
                        transform: "translateX(4px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: isSettlement
                          ? alpha(theme.palette.success.main, 0.1)
                          : isPersonal
                            ? alpha(theme.palette.info.main, 0.1)
                            : alpha(theme.palette.primary.main, 0.1),
                        color: isSettlement
                          ? "success.main"
                          : isPersonal
                            ? "info.main"
                            : "primary.main",
                      }}
                    >
                      {isSettlement ? (
                        <Handshake size={24} weight="duotone" />
                      ) : (
                        <Receipt size={24} weight="duotone" />
                      )}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 800, fontSize: "0.95rem", mb: 0.2 }}
                      >
                        {t.description || "General Expense"}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            opacity: 0.6,
                          }}
                        >
                          {new Date(t.created_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </Typography>
                        <Box
                          sx={{
                            width: 3,
                            height: 3,
                            borderRadius: "50%",
                            bgcolor: "text.disabled",
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontWeight: 700,
                            opacity: 0.8,
                          }}
                        >
                          {isMyExpense
                            ? "Paid by You"
                            : `Paid by ${t.user_name?.split(" ")[0]}`}
                        </Typography>
                      </Stack>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 900,
                          fontSize: "1rem",
                          color: isMyExpense ? "error.main" : "success.main",
                          mb: 0.5,
                        }}
                      >
                        {isMyExpense ? "-" : "+"}₹{Math.round(t.amount)}
                      </Typography>
                      <Chip
                        label={tag}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.6rem",
                          fontWeight: 900,
                          bgcolor: alpha(tagColor, 0.1),
                          color: tagColor,
                          border: `1px solid ${alpha(tagColor, 0.1)}`,
                          borderRadius: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      />
                    </Box>
                  </Card>
                );
              })}
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
