import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  IconButton,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  Skeleton,
  LinearProgress,
  Divider,
  Collapse,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  CaretLeft,
  CaretRight,
  Broom,
  Check,
  X,
  Gear,
  Users,
  CalendarBlank,
  CurrencyInr,
  CheckCircle,
  CaretDown,
  CaretUp,
  UserMinus,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "../api";
import useAuthStore from "../store/auth";

// ─── Helpers ───
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const getInitials = (name) =>
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const MEMBER_COLORS = [
  "#0b57d0",
  "#b5179e",
  "#e65100",
  "#1b5e20",
  "#1565c0",
  "#c62828",
  "#6a1b9a",
  "#00695c",
];

// ─── Main Component ───
const MaidAttendance = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mode = theme.palette.mode;
  const { user } = useAuthStore();

  const [cycleOffset, setCycleOffset] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    rate: "1300",
    cycleStart: "",
    cycleEnd: "",
    members: [],
  });

  // ─── Queries ───
  const { data: membersData } = useQuery({
    queryKey: ["group-members"],
    queryFn: () => api.get("/group/members"),
  });

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ["maidConfig"],
    queryFn: () => api.get("/settings/group-get?key=maid_config"),
  });

  const config = useMemo(() => {
    if (!configData?.value) return null;
    const c =
      typeof configData.value === "string"
        ? JSON.parse(configData.value)
        : configData.value;
    if (!c.cycleStart) return null;
    return {
      rate: c.rate || 1300,
      cycleStart: c.cycleStart,
      cycleEnd: c.cycleEnd || null,
      members: c.members || [],
      split: c.members?.length || c.split || 4,
    };
  }, [configData]);

  const cycleDates = useMemo(() => {
    if (!config) return null;
    const baseStart = parseDate(config.cycleStart);
    const baseEnd = config.cycleEnd ? parseDate(config.cycleEnd) : null;
    if (baseEnd) {
      const cycleLen =
        Math.floor((baseEnd - baseStart) / (1000 * 60 * 60 * 24)) + 1;
      const start = addDays(baseStart, cycleOffset * cycleLen);
      const end = addDays(start, cycleLen - 1);
      return { start, end, days: cycleLen };
    }
    const start = addDays(baseStart, cycleOffset * 30);
    const end = addDays(start, 29);
    return { start, end, days: 30 };
  }, [config, cycleOffset]);

  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: [
      "maidAtt",
      cycleDates?.start && fmtDate(cycleDates.start),
      cycleDates?.end && fmtDate(cycleDates.end),
    ],
    queryFn: () =>
      api.get(
        `/settings/group-get-range?key=maid_att&from=${fmtDate(cycleDates.start)}&to=${fmtDate(cycleDates.end)}`,
      ),
    enabled: !!cycleDates,
  });

  const attendance = useMemo(() => {
    const map = {};
    if (attData?.entries) {
      attData.entries.forEach((e) => {
        const val = typeof e.value === "string" ? JSON.parse(e.value) : e.value;
        if (val) {
          map[e.date] = {
            m: !!val.m,
            e: !!val.e,
            excluded: Array.isArray(val.excluded) ? val.excluded : [],
          };
        }
      });
    }
    return map;
  }, [attData]);

  const groupMembers = membersData?.members || [];
  const enrolledMembers = useMemo(
    () => groupMembers.filter((m) => config?.members?.includes(m.id)),
    [groupMembers, config],
  );

  // ─── Mutations ───
  const saveDayMutation = useMutation({
    mutationFn: ({ dateKey, value }) =>
      api.post("/settings/group-set", {
        key: "maid_att",
        value,
        date: dateKey,
      }),
    onSuccess: () => queryClient.invalidateQueries(["maidAtt"]),
    onError: () => toast.error("Failed to save"),
  });

  const saveConfigMutation = useMutation({
    mutationFn: (value) =>
      api.post("/settings/group-set", { key: "maid_config", value }),
    onSuccess: () => {
      queryClient.invalidateQueries(["maidConfig"]);
      queryClient.invalidateQueries(["maidAtt"]);
      setSetupOpen(false);
      toast.success("Config saved!");
    },
    onError: () => toast.error("Failed to save config"),
  });

  const toggleShift = useCallback(
    (dateKey, shift) => {
      const current = attendance[dateKey] || {
        m: false,
        e: false,
        excluded: [],
      };
      const updated = { ...current, [shift]: !current[shift] };
      saveDayMutation.mutate({ dateKey, value: updated });
    },
    [attendance, saveDayMutation],
  );

  const toggleFullDay = useCallback(
    (dateKey) => {
      const current = attendance[dateKey] || {
        m: false,
        e: false,
        excluded: [],
      };
      const allOn = current.m && current.e;
      const updated = { ...current, m: !allOn, e: !allOn };
      saveDayMutation.mutate({ dateKey, value: updated });
    },
    [attendance, saveDayMutation],
  );

  const toggleMemberExclusion = useCallback(
    (dateKey, memberId) => {
      const current = attendance[dateKey] || {
        m: false,
        e: false,
        excluded: [],
      };
      const excluded = [...(current.excluded || [])];
      const idx = excluded.indexOf(memberId);
      if (idx >= 0) excluded.splice(idx, 1);
      else excluded.push(memberId);
      const updated = { ...current, excluded };
      saveDayMutation.mutate({ dateKey, value: updated });
    },
    [attendance, saveDayMutation],
  );

  // ─── Cost Calculation ───
  const stats = useMemo(() => {
    if (!config || !cycleDates) return null;
    const totalMembers = config.members.length;
    if (totalMembers === 0) return null;

    const totalSalary = config.rate * totalMembers;
    const totalDays = cycleDates.days;
    const totalShiftsPossible = totalDays * 2;
    const shiftCost = totalSalary / totalShiftsPossible;

    const memberCosts = {};
    config.members.forEach((id) => {
      memberCosts[id] = { shifts: 0, cost: 0 };
    });

    let daysCame = 0,
      totalShiftsWorked = 0,
      morningShifts = 0,
      eveningShifts = 0;

    for (let i = 0; i < totalDays; i++) {
      const d = addDays(cycleDates.start, i);
      const dk = fmtDate(d);
      const a = attendance[dk] || { m: false, e: false, excluded: [] };
      const excluded = a.excluded || [];
      const activeIds = config.members.filter((id) => !excluded.includes(id));
      if (activeIds.length === 0) continue;

      if (a.m || a.e) daysCame++;
      if (a.m) {
        morningShifts++;
        totalShiftsWorked++;
        const perMember = shiftCost / activeIds.length;
        activeIds.forEach((id) => {
          memberCosts[id].shifts++;
          memberCosts[id].cost += perMember;
        });
      }
      if (a.e) {
        eveningShifts++;
        totalShiftsWorked++;
        const perMember = shiftCost / activeIds.length;
        activeIds.forEach((id) => {
          memberCosts[id].shifts++;
          memberCosts[id].cost += perMember;
        });
      }
    }

    return {
      daysCame,
      totalDays,
      totalSalary,
      actualTotal: Math.round(totalShiftsWorked * shiftCost),
      shiftCost: Math.round(shiftCost),
      totalShiftsWorked,
      morningShifts,
      eveningShifts,
      attendancePct: Math.round((daysCame / totalDays) * 100),
      memberCosts,
    };
  }, [config, cycleDates, attendance]);

  // ─── Form ───
  const openSetup = () => {
    if (config) {
      setConfigForm({
        rate: String(config.rate),
        cycleStart: config.cycleStart,
        cycleEnd: config.cycleEnd || "",
        members: [...config.members],
      });
    } else {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setConfigForm({
        rate: "1300",
        cycleStart: fmtDate(first),
        cycleEnd: fmtDate(last),
        members: groupMembers.map((m) => m.id),
      });
    }
    setSetupOpen(true);
  };

  const handleSaveConfig = () => {
    if (!configForm.cycleStart || !configForm.cycleEnd) {
      toast.error("Set cycle start & end dates");
      return;
    }
    if (configForm.members.length === 0) {
      toast.error("Select at least one member");
      return;
    }
    saveConfigMutation.mutate({
      rate: parseInt(configForm.rate) || 1300,
      cycleStart: configForm.cycleStart,
      cycleEnd: configForm.cycleEnd,
      members: configForm.members,
      split: configForm.members.length,
    });
  };

  const toggleConfigMember = (id) => {
    setConfigForm((f) => ({
      ...f,
      members: f.members.includes(id)
        ? f.members.filter((m) => m !== id)
        : [...f.members, id],
    }));
  };

  const today = new Date();
  const todayStr = fmtDate(today);
  const cycleDaysList = useMemo(() => {
    if (!cycleDates) return [];
    const arr = [];
    for (let i = 0; i < cycleDates.days; i++)
      arr.push(addDays(cycleDates.start, i));
    return arr;
  }, [cycleDates]);
  const todayInCycle = cycleDaysList.some((d) => fmtDate(d) === todayStr);

  const getMemberColor = (memberId) => {
    const idx = (config?.members || []).indexOf(memberId);
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

  if (configLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 3 }}>
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
              border: `1px solid ${theme.palette.divider}`,
              width: 44,
              height: 44,
            }}
          >
            <CaretLeft size={20} weight="bold" />
          </IconButton>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, letterSpacing: "-1.5px" }}
            >
              Maid Attendance
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 600 }}
            >
              Track shifts & split costs
            </Typography>
          </Box>
        </Stack>
        {config && (
          <IconButton
            onClick={openSetup}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: "primary.main",
              width: 44,
              height: 44,
            }}
          >
            <Gear size={20} weight="bold" />
          </IconButton>
        )}
      </Box>

      <Container maxWidth="sm">
        {!config ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card
              elevation={0}
              sx={{
                p: 5,
                borderRadius: "28px",
                textAlign: "center",
                border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
                mt: 4,
              }}
            >
              <Broom
                size={52}
                weight="duotone"
                color={theme.palette.text.disabled}
                style={{ marginBottom: 16 }}
              />
              <Typography
                variant="h6"
                sx={{ fontWeight: 900, mb: 1, color: "text.secondary" }}
              >
                Set Up Maid Tracking
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.disabled",
                  fontWeight: 600,
                  mb: 3,
                  maxWidth: 280,
                  mx: "auto",
                }}
              >
                Configure members, salary rate, and billing cycle to start
                tracking
              </Typography>
              <Button
                variant="contained"
                disableElevation
                startIcon={<Gear weight="bold" />}
                onClick={openSetup}
                sx={{
                  borderRadius: "16px",
                  px: 4,
                  py: 1.5,
                  fontWeight: 800,
                  textTransform: "none",
                }}
              >
                Configure Now
              </Button>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Cycle Nav */}
            {cycleDates && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "20px",
                    mb: 2.5,
                    bgcolor: "background.paper",
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <IconButton
                      onClick={() => setCycleOffset((p) => p - 1)}
                      sx={{ width: 44, height: 44 }}
                    >
                      <CaretLeft size={18} weight="bold" />
                    </IconButton>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
                      >
                        {cycleDates.start.getDate()}{" "}
                        {MONTHS[cycleDates.start.getMonth()].slice(0, 3)} →{" "}
                        {cycleDates.end.getDate()}{" "}
                        {MONTHS[cycleDates.end.getMonth()].slice(0, 3)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.disabled",
                          fontWeight: 600,
                          fontSize: "0.6rem",
                        }}
                      >
                        {cycleDates.days}-day cycle
                        {cycleOffset === 0 && " • Current"}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => setCycleOffset((p) => p + 1)}
                      sx={{ width: 44, height: 44 }}
                    >
                      <CaretRight size={18} weight="bold" />
                    </IconButton>
                  </Stack>
                </Card>
              </motion.div>
            )}

            {/* Today */}
            {todayInCycle && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <TodayCard
                  dateKey={todayStr}
                  attendance={attendance}
                  enrolledMembers={enrolledMembers}
                  config={config}
                  toggleShift={toggleShift}
                  toggleFullDay={toggleFullDay}
                  toggleMemberExclusion={toggleMemberExclusion}
                  getMemberColor={getMemberColor}
                  theme={theme}
                  mode={mode}
                />
              </motion.div>
            )}

            {/* Summary */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <SummaryCard
                  stats={stats}
                  config={config}
                  enrolledMembers={enrolledMembers}
                  getMemberColor={getMemberColor}
                  theme={theme}
                  mode={mode}
                />
              </motion.div>
            )}

            {/* Day List */}
            {attLoading ? (
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    height={64}
                    sx={{ borderRadius: "16px" }}
                  />
                ))}
              </Stack>
            ) : (
              <Box sx={{ mt: 2 }}>
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
                  ALL DAYS ({cycleDates?.days || 0})
                </Typography>
                <Stack spacing={1}>
                  <AnimatePresence>
                    {cycleDaysList.map((d, idx) => {
                      const dk = fmtDate(d);
                      if (dk === todayStr && todayInCycle) return null;
                      return (
                        <motion.div
                          key={dk}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.012 }}
                        >
                          <DayRow
                            date={d}
                            dateKey={dk}
                            attendance={attendance}
                            enrolledMembers={enrolledMembers}
                            config={config}
                            toggleShift={toggleShift}
                            toggleMemberExclusion={toggleMemberExclusion}
                            getMemberColor={getMemberColor}
                            isFuture={d > today}
                            theme={theme}
                            mode={mode}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </Stack>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* ─── Config Dialog ─── */}
      <Dialog
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "28px",
            maxWidth: "440px",
            backgroundImage: "none",
            bgcolor: "background.paper",
            mx: 2,
          },
        }}
      >
        {/* Dialog Header */}
        <Box
          sx={{
            px: 3,
            pt: 3,
            pb: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Gear
                weight="duotone"
                size={26}
                color={theme.palette.primary.main}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}
              >
                Maid Config
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                Set members, rate & cycle
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={() => setSetupOpen(false)}
            sx={{ width: 40, height: 40, color: "text.disabled" }}
          >
            <X weight="bold" size={20} />
          </IconButton>
        </Box>

        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={3.5}>
            {/* ── Members Selection ── */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 900,
                  color: "text.secondary",
                  letterSpacing: "0.8px",
                  mb: 1.5,
                  display: "block",
                  textTransform: "uppercase",
                  fontSize: "0.65rem",
                }}
              >
                Who shares the maid cost?
              </Typography>
              <Stack spacing={1}>
                {groupMembers.map((m) => {
                  const selected = configForm.members.includes(m.id);
                  const color =
                    MEMBER_COLORS[
                      groupMembers.indexOf(m) % MEMBER_COLORS.length
                    ];
                  return (
                    <Box
                      key={m.id}
                      onClick={() => toggleConfigMember(m.id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 2,
                        borderRadius: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        bgcolor: selected
                          ? alpha(color, 0.08)
                          : alpha(theme.palette.divider, 0.04),
                        border: selected
                          ? `2px solid ${alpha(color, 0.35)}`
                          : `2px solid transparent`,
                        "&:active": { transform: "scale(0.98)" },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            fontWeight: 900,
                            fontSize: "0.75rem",
                            bgcolor: selected
                              ? color
                              : alpha(theme.palette.text.disabled, 0.15),
                            color: "white",
                          }}
                        >
                          {getInitials(m.name)}
                        </Avatar>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: "0.95rem" }}
                        >
                          {m.name}
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: selected
                            ? color
                            : alpha(theme.palette.divider, 0.08),
                          transition: "all 0.2s ease",
                        }}
                      >
                        {selected ? (
                          <Check size={16} weight="bold" color="white" />
                        ) : (
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "3px",
                              border: `2px solid ${theme.palette.divider}`,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            {/* ── Rate ── */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 900,
                  color: "text.secondary",
                  letterSpacing: "0.8px",
                  mb: 1,
                  display: "block",
                  textTransform: "uppercase",
                  fontSize: "0.65rem",
                }}
              >
                Rate per person / month
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 2,
                  borderRadius: "16px",
                  bgcolor: alpha(theme.palette.divider, 0.04),
                  border: `1.5px solid ${alpha(theme.palette.divider, 0.12)}`,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: "1.3rem",
                    color: "text.secondary",
                  }}
                >
                  ₹
                </Typography>
                <TextField
                  fullWidth
                  variant="standard"
                  type="number"
                  value={configForm.rate}
                  onChange={(e) =>
                    setConfigForm((f) => ({ ...f, rate: e.target.value }))
                  }
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      fontWeight: 900,
                      fontSize: "1.5rem",
                      letterSpacing: "-1px",
                    },
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.disabled",
                  fontWeight: 700,
                  mt: 1,
                  display: "block",
                  px: 0.5,
                }}
              >
                Total salary = ₹{configForm.rate} × {configForm.members.length}{" "}
                members ={" "}
                <strong>
                  ₹
                  {(parseInt(configForm.rate) || 0) * configForm.members.length}
                </strong>
              </Typography>
            </Box>

            {/* ── Cycle Dates ── */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 900,
                  color: "text.secondary",
                  letterSpacing: "0.8px",
                  mb: 1,
                  display: "block",
                  textTransform: "uppercase",
                  fontSize: "0.65rem",
                }}
              >
                Billing Cycle
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: "text.disabled",
                      mb: 0.5,
                      display: "block",
                      fontSize: "0.6rem",
                    }}
                  >
                    START
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    type="date"
                    value={configForm.cycleStart}
                    onChange={(e) =>
                      setConfigForm((f) => ({
                        ...f,
                        cycleStart: e.target.value,
                      }))
                    }
                    InputProps={{
                      sx: {
                        borderRadius: "14px",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        height: 52,
                        "& fieldset": {
                          borderColor: alpha(theme.palette.divider, 0.2),
                        },
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: "text.disabled",
                      mb: 0.5,
                      display: "block",
                      fontSize: "0.6rem",
                    }}
                  >
                    END
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    type="date"
                    value={configForm.cycleEnd}
                    onChange={(e) =>
                      setConfigForm((f) => ({ ...f, cycleEnd: e.target.value }))
                    }
                    InputProps={{
                      sx: {
                        borderRadius: "14px",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        height: 52,
                        "& fieldset": {
                          borderColor: alpha(theme.palette.divider, 0.2),
                        },
                      },
                    }}
                  />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            fullWidth
            variant="contained"
            disableElevation
            onClick={handleSaveConfig}
            disabled={saveConfigMutation.isPending}
            sx={{
              borderRadius: "16px",
              py: 2,
              fontWeight: 900,
              fontSize: "1rem",
              textTransform: "none",
              height: 56,
            }}
          >
            {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

// ═══════════════════════════════════════════════════
//  TODAY CARD
// ═══════════════════════════════════════════════════
const TodayCard = ({
  dateKey,
  attendance,
  enrolledMembers,
  config,
  toggleShift,
  toggleFullDay,
  toggleMemberExclusion,
  getMemberColor,
  theme,
  mode,
}) => {
  const a = attendance[dateKey] || { m: false, e: false, excluded: [] };
  const allOn = a.m && a.e;
  const excluded = a.excluded || [];
  const today = new Date();

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "24px",
        mb: 2.5,
        overflow: "hidden",
        bgcolor: "primary.container",
        color: "primary.onContainer",
        border:
          mode === "light"
            ? "1px solid rgba(0,0,0,0.04)"
            : `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
      }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                opacity: 0.6,
                letterSpacing: "1.2px",
                fontSize: "0.6rem",
              }}
            >
              Today
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
            >
              {DAY_NAMES[today.getDay()]}, {today.getDate()}{" "}
              {MONTHS[today.getMonth()]}
            </Typography>
          </Box>
          <Button
            size="small"
            variant={allOn ? "contained" : "outlined"}
            disableElevation
            onClick={() => toggleFullDay(dateKey)}
            startIcon={
              allOn ? (
                <CheckCircle size={16} weight="fill" />
              ) : (
                <Broom size={16} weight="bold" />
              )
            }
            sx={{
              borderRadius: "14px",
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.75rem",
              px: 2,
              height: 40,
              ...(allOn
                ? {
                    bgcolor: "#2e7d32",
                    color: "white",
                    "&:hover": { bgcolor: "#1b5e20" },
                  }
                : {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    color: "primary.main",
                  }),
            }}
          >
            {allOn ? "Full Day ✓" : "Mark Full Day"}
          </Button>
        </Stack>
      </Box>

      {/* Big Maid Shift Toggles */}
      <Box sx={{ px: 2.5, pt: 0.5, pb: 2 }}>
        <Stack direction="row" spacing={2}>
          {[
            {
              key: "m",
              label: "Morning",
              icon: "☀️",
              on: a.m,
              onBg: "#fff3e0",
              onBorder: "#ff9800",
              onText: "#e65100",
            },
            {
              key: "e",
              label: "Evening",
              icon: "🌙",
              on: a.e,
              onBg: "#ede7f6",
              onBorder: "#7c4dff",
              onText: "#4a148c",
            },
          ].map((shift) => (
            <Box
              key={shift.key}
              onClick={() => toggleShift(dateKey, shift.key)}
              sx={{
                flex: 1,
                py: 3,
                borderRadius: "20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                bgcolor: shift.on
                  ? mode === "dark"
                    ? alpha(shift.onBorder, 0.15)
                    : shift.onBg
                  : mode === "light"
                    ? alpha(theme.palette.background.paper, 0.5)
                    : alpha(theme.palette.background.paper, 0.15),
                border: shift.on
                  ? `2.5px solid ${shift.onBorder}`
                  : `2px dashed ${alpha(theme.palette.divider, 0.2)}`,
                "&:active": { transform: "scale(0.95)" },
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Checkmark badge */}
              {shift.on && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    borderRadius: "7px",
                    bgcolor: shift.onBorder,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={14} weight="bold" color="white" />
                </Box>
              )}
              <Typography sx={{ fontSize: "2.2rem", mb: 0.5 }}>
                {shift.icon}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "0.9rem",
                  letterSpacing: "-0.3px",
                  color: shift.on
                    ? mode === "dark"
                      ? shift.onBorder
                      : shift.onText
                    : "text.disabled",
                }}
              >
                {shift.label}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  mt: 0.3,
                  color: shift.on
                    ? mode === "dark"
                      ? shift.onBorder
                      : shift.onText
                    : "text.disabled",
                  opacity: shift.on ? 0.8 : 0.4,
                }}
              >
                {shift.on ? "Maid Came ✓" : "Tap to mark"}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Member Exclusions */}
      {enrolledMembers.length > 1 && (
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: "16px",
              bgcolor:
                mode === "light"
                  ? alpha(theme.palette.background.paper, 0.5)
                  : alpha(theme.palette.background.paper, 0.2),
              border: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                fontSize: "0.65rem",
                letterSpacing: "0.5px",
                opacity: 0.6,
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <UserMinus size={12} weight="bold" /> ANYONE NOT HOME TODAY?
            </Typography>
            <Stack spacing={1}>
              {enrolledMembers.map((m) => {
                const isExcluded = excluded.includes(m.id);
                const color = getMemberColor(m.id);
                return (
                  <Box
                    key={m.id}
                    onClick={() => toggleMemberExclusion(dateKey, m.id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 2,
                      py: 1.5,
                      borderRadius: "14px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      bgcolor: isExcluded
                        ? alpha("#d32f2f", 0.08)
                        : alpha(color, 0.04),
                      border: isExcluded
                        ? `2px solid ${alpha("#d32f2f", 0.25)}`
                        : `1.5px solid ${alpha(theme.palette.divider, 0.08)}`,
                      "&:active": { transform: "scale(0.97)" },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: "0.65rem",
                          fontWeight: 900,
                          bgcolor: isExcluded
                            ? alpha("#d32f2f", 0.15)
                            : alpha(color, 0.12),
                          color: isExcluded ? "#d32f2f" : color,
                        }}
                      >
                        {getInitials(m.name)}
                      </Avatar>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: isExcluded ? "#d32f2f" : "inherit",
                          textDecoration: isExcluded ? "line-through" : "none",
                        }}
                      >
                        {m.name.split(" ")[0]}
                      </Typography>
                    </Stack>
                    {isExcluded ? (
                      <Chip
                        label="Away"
                        size="small"
                        sx={{
                          height: 24,
                          bgcolor: alpha("#d32f2f", 0.1),
                          color: "#d32f2f",
                          fontWeight: 800,
                          fontSize: "0.65rem",
                        }}
                      />
                    ) : (
                      <Typography
                        sx={{
                          color: "text.disabled",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                        }}
                      >
                        Home
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      )}
    </Card>
  );
};

// ═══════════════════════════════════════════════════
//  SUMMARY CARD
// ═══════════════════════════════════════════════════
const SummaryCard = ({
  stats,
  config,
  enrolledMembers,
  getMemberColor,
  theme,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "24px",
        mb: 2.5,
        overflow: "hidden",
        bgcolor: "background.paper",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          {[
            {
              label: "Maid Came",
              value: (
                <>
                  {stats.daysCame}
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.disabled" }}
                  >
                    /{stats.totalDays}
                  </Typography>
                </>
              ),
            },
            {
              label: "Total Bill",
              value: `₹${stats.actualTotal.toLocaleString()}`,
            },
            { label: "Shifts", value: stats.totalShiftsWorked },
          ].map((s, i) => (
            <Box
              key={i}
              sx={{
                textAlign: i === 0 ? "left" : i === 2 ? "right" : "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  opacity: 0.5,
                  fontSize: "0.6rem",
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}
              >
                {s.value}
              </Typography>
            </Box>
          ))}
        </Stack>

        <LinearProgress
          variant="determinate"
          value={stats.attendancePct}
          sx={{
            height: 6,
            borderRadius: 3,
            mb: 1,
            bgcolor: alpha(theme.palette.divider, 0.1),
            "& .MuiLinearProgress-bar": {
              borderRadius: 3,
              bgcolor: "primary.main",
            },
          }}
        />

        <Stack direction="row" spacing={2}>
          {[
            `☀️ ${stats.morningShifts}`,
            `🌙 ${stats.eveningShifts}`,
            `₹${stats.shiftCost}/shift`,
          ].map((t, i) => (
            <Typography
              key={i}
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              {t}
            </Typography>
          ))}
        </Stack>
      </Box>

      <Divider sx={{ opacity: 0.5 }} />

      <Box
        sx={{
          px: 3,
          py: 2,
          cursor: "pointer",
          "&:active": { bgcolor: "action.hover" },
        }}
        onClick={() => setExpanded((p) => !p)}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              color: "text.secondary",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              fontSize: "0.65rem",
            }}
          >
            Who Owes What
          </Typography>
          {expanded ? (
            <CaretUp
              size={16}
              weight="bold"
              color={theme.palette.text.secondary}
            />
          ) : (
            <CaretDown
              size={16}
              weight="bold"
              color={theme.palette.text.secondary}
            />
          )}
        </Stack>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 3, pb: 2.5 }}>
          <Stack spacing={1.5}>
            {enrolledMembers.map((m) => {
              const mc = stats.memberCosts[m.id] || { shifts: 0, cost: 0 };
              const color = getMemberColor(m.id);
              return (
                <Stack
                  key={m.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    p: 1.5,
                    borderRadius: "14px",
                    bgcolor: alpha(color, 0.04),
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: alpha(color, 0.15),
                        color,
                        fontWeight: 900,
                        fontSize: "0.7rem",
                      }}
                    >
                      {getInitials(m.name)}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 800, fontSize: "0.85rem" }}
                      >
                        {m.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.disabled",
                          fontWeight: 600,
                          fontSize: "0.6rem",
                        }}
                      >
                        {mc.shifts} shifts charged
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 900, color, fontSize: "1rem" }}
                  >
                    ₹{Math.round(mc.cost).toLocaleString()}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Collapse>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
//  DAY ROW
// ═══════════════════════════════════════════════════
const DayRow = ({
  date,
  dateKey,
  attendance,
  enrolledMembers,
  config,
  toggleShift,
  toggleMemberExclusion,
  getMemberColor,
  isFuture,
  theme,
  mode,
}) => {
  const [expanded, setExpanded] = useState(false);
  const a = attendance[dateKey] || { m: false, e: false, excluded: [] };
  const excluded = a.excluded || [];
  const both = a.m && a.e;
  const any = a.m || a.e;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "16px",
        overflow: "hidden",
        bgcolor: "background.paper",
        border: `1px solid ${theme.palette.divider}`,
        opacity: isFuture ? 0.45 : 1,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
          transition: "background 0.15s",
        }}
        onClick={() => setExpanded((p) => !p)}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: both
                  ? alpha("#2e7d32", 0.1)
                  : any
                    ? alpha("#f59e0b", 0.1)
                    : alpha(theme.palette.divider, 0.06),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "0.95rem",
                  lineHeight: 1,
                  color: both ? "#2e7d32" : any ? "#f59e0b" : "text.disabled",
                }}
              >
                {date.getDate()}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "0.5rem",
                  letterSpacing: "0.5px",
                  color: both ? "#2e7d32" : any ? "#f59e0b" : "text.disabled",
                }}
              >
                {DAY_NAMES[date.getDay()]}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontSize: "0.85rem" }}
              >
                {MONTHS[date.getMonth()].slice(0, 3)} {date.getDate()}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                {both ? (
                  <Chip
                    label="Full Day ✓"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      bgcolor: alpha("#2e7d32", 0.1),
                      color: "#2e7d32",
                    }}
                  />
                ) : any ? (
                  <Chip
                    label={a.m ? "☀️ Morning" : "🌙 Evening"}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      bgcolor: alpha("#f59e0b", 0.1),
                      color: "#f59e0b",
                    }}
                  />
                ) : (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.disabled",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                    }}
                  >
                    Absent
                  </Typography>
                )}
                {excluded.length > 0 && (
                  <Chip
                    label={`${excluded.length} away`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.5rem",
                      fontWeight: 800,
                      bgcolor: alpha("#d32f2f", 0.06),
                      color: "#d32f2f",
                    }}
                  />
                )}
              </Stack>
            </Box>
          </Stack>

          {/* Quick shift toggles — always visible */}
          <Stack direction="row" spacing={1} alignItems="center">
            {[
              {
                key: "m",
                icon: "☀️",
                on: a.m,
                color: "#ff9800",
                bg: "#fff3e0",
              },
              {
                key: "e",
                icon: "🌙",
                on: a.e,
                color: "#7c4dff",
                bg: "#ede7f6",
              },
            ].map((s) => (
              <Box
                key={s.key}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleShift(dateKey, s.key);
                }}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  fontSize: "1.1rem",
                  bgcolor: s.on
                    ? mode === "dark"
                      ? alpha(s.color, 0.18)
                      : s.bg
                    : alpha(theme.palette.divider, 0.06),
                  border: s.on
                    ? `2px solid ${s.color}`
                    : `1.5px solid ${alpha(theme.palette.divider, 0.12)}`,
                  boxShadow: s.on ? `0 2px 8px ${alpha(s.color, 0.2)}` : "none",
                  opacity: s.on ? 1 : 0.4,
                  "&:active": { transform: "scale(0.88)" },
                }}
              >
                {s.icon}
              </Box>
            ))}
            <Box sx={{ width: 20, display: "flex", justifyContent: "center" }}>
              {expanded ? (
                <CaretUp
                  size={14}
                  weight="bold"
                  color={theme.palette.text.disabled}
                />
              ) : (
                <CaretDown
                  size={14}
                  weight="bold"
                  color={theme.palette.text.disabled}
                />
              )}
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              opacity: 0.5,
              fontSize: "0.6rem",
              letterSpacing: "0.5px",
              mb: 1,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <UserMinus size={10} weight="bold" /> TAP MEMBERS WHO WERE AWAY
          </Typography>
          <Stack spacing={0.8}>
            {enrolledMembers.map((m) => {
              const isExcluded = excluded.includes(m.id);
              const color = getMemberColor(m.id);
              return (
                <Box
                  key={m.id}
                  onClick={() => toggleMemberExclusion(dateKey, m.id)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    py: 1.2,
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    bgcolor: isExcluded
                      ? alpha("#d32f2f", 0.06)
                      : alpha(color, 0.03),
                    border: isExcluded
                      ? `1.5px solid ${alpha("#d32f2f", 0.2)}`
                      : `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                    "&:active": { transform: "scale(0.97)" },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: "0.55rem",
                        fontWeight: 900,
                        bgcolor: isExcluded
                          ? alpha("#d32f2f", 0.12)
                          : alpha(color, 0.1),
                        color: isExcluded ? "#d32f2f" : color,
                      }}
                    >
                      {getInitials(m.name)}
                    </Avatar>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: isExcluded ? "#d32f2f" : "text.primary",
                        textDecoration: isExcluded ? "line-through" : "none",
                      }}
                    >
                      {m.name.split(" ")[0]}
                    </Typography>
                  </Stack>
                  {isExcluded && (
                    <Chip
                      label="Away"
                      size="small"
                      sx={{
                        height: 22,
                        bgcolor: alpha("#d32f2f", 0.08),
                        color: "#d32f2f",
                        fontWeight: 800,
                        fontSize: "0.6rem",
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Collapse>
    </Card>
  );
};

export default MaidAttendance;
